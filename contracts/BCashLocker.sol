// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IBCash.sol";

contract BCashLocker is ReentrancyGuard {
    uint256 _releaseAmount = 50000 * 10**18; // 50k bCASH

    bool _stagger = false;

    mapping(address => TimeLock) public addressToLocker;
    mapping(address => bool) private _accountLocked;
    address[] _lockedAccounts;

    uint256 private _totalAmountLocked;

    struct TimeLock {
        uint256 startingBalance;
        uint256 firstUnlock;
        uint256 claimedAmount;
    }

    IBCash _bc;

    constructor(address bcashAddress) {
        _bc = IBCash(bcashAddress);
    }

    function lock(uint256 _amount) public nonReentrant {
        // todo:
        // - only allow over X amount to be locked

        // allow for simple input instead of wei
        uint256 weiAmount = _amount * 10**18;

        require(!_accountLocked[msg.sender], "You are already locking.");
        require(_bc.transferFrom(msg.sender, address(this), weiAmount));

        TimeLock memory _locker;

        _locker.startingBalance = weiAmount;

        // alternate between a first unlock of 4 and 6 weeks to stagger token releases
        if (_stagger) {
            _locker.firstUnlock = block.timestamp + 6 weeks;
        } else {
            _locker.firstUnlock = block.timestamp + 4 weeks;
        }

        addressToLocker[msg.sender] = _locker;
        _lockedAccounts.push(msg.sender);
        _accountLocked[msg.sender] = true;

        _totalAmountLocked += weiAmount;

        _stagger = !_stagger;
    }

    function amountLockedFor(address _holder) public view returns (uint256) {
        return addressToLocker[_holder].startingBalance - addressToLocker[_holder].claimedAmount;
    }

    function totalAmountLocked() public view returns (uint256) {
        return _totalAmountLocked;
    }

    function totalAccountsLocked() public view returns (uint256) {
        return _lockedAccounts.length;
    }

    function timeUntilNextClaimFor(address _holder) public view returns (uint256) {
        TimeLock memory _locker = addressToLocker[_holder];
        if (_locker.firstUnlock > block.timestamp) {
            return _locker.firstUnlock - block.timestamp;
        } else {
            uint256 releasesSoFar = _locker.claimedAmount / _releaseAmount;
            uint256 nextRelease = (releasesSoFar * 4 weeks) + _locker.firstUnlock;

            if (nextRelease > block.timestamp) {
                return nextRelease - block.timestamp;
            } else {
                // this state occurs when someone has not claimed rewards yet, but is elligible.
                return 0;
            }
        }
    }

    function claim() public nonReentrant {
        uint256 _claimable = amountClaimableFor(msg.sender);
        require(_claimable > 0, "Nothing to claim!");

        TimeLock storage _locker = addressToLocker[msg.sender];

        // increment claimed amount
        _locker.claimedAmount += _claimable;
        // transfer claimable
        _bc.transfer(msg.sender, _claimable);

        // claimable should never be gt amount locked, but just in case, prevent less than 0 errors
        if (_totalAmountLocked > _claimable) {
            _totalAmountLocked -= _claimable;
        } else {
            _totalAmountLocked = 0;
        }

        if (amountLockedFor(msg.sender) == 0) {
            remove(msg.sender);
            _accountLocked[msg.sender] = false;
        }
    }

    function remove(address account) private {
        uint256 index;

        for (uint256 i = 0; i < _lockedAccounts.length; i++) {
            if (account == _lockedAccounts[i]) {
                index = i;
            }
        }

        for(uint256 i = index; i < (_lockedAccounts.length - 1); i++) {
            _lockedAccounts[i] = _lockedAccounts[i + 1];
        }

        _lockedAccounts.pop();
    }

    function lockedAccounts() public view returns (address[] memory) {
        return _lockedAccounts;
    }

    function amountClaimableFor(address _holder) public view returns(uint256) {
        TimeLock memory _locker = addressToLocker[_holder];
        uint256 _balance = _locker.startingBalance - _locker.claimedAmount;

        if (_balance == 0 || _locker.firstUnlock > block.timestamp) {
            return 0;
        } else {
            // first, get the time that's passed since first unlock
            // second, divide that by 4 weeks
            // last, add 1 to account for the first unlock
            uint256 unlockPeriodsCompleted = ((block.timestamp - _locker.firstUnlock) / 4 weeks) + 1;
            uint256 totalUnlocked = unlockPeriodsCompleted * _releaseAmount;
            uint256 maxClaimable = totalUnlocked - _locker.claimedAmount;

            // return max claimable or balance, whichever is greater
            if (_balance > maxClaimable) {
                return maxClaimable;
            } else {
                return _balance;
            }
        }
    }

}