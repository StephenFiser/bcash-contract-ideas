// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BCashStub is ERC20 {

  constructor() ERC20("BCASH", "BCASH") {}

  function mint(address recipient) public {
    _mint(recipient, 1000000 ether);
  }

}