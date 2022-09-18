const BCashLocker = artifacts.require('BCashLocker')
const BCashStub = artifacts.require('BCashStub')

async function fastForward(seconds) {
  await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [seconds], id: 0 }, () => {})
  await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 }, () => {})
}

contract('BCashLocker', async (accounts) => {

  it("allows a user to lock their BCash", async () => {

    const vester = accounts[5]

    const bcash = await BCashStub.new()
    const locker = await BCashLocker.new(bcash.address)

    await bcash.mint(vester)

    const balance = web3.utils.fromWei(await bcash.balanceOf(vester))

    console.log('BALANCE', balance)

    await bcash.approve(locker.address, web3.utils.toWei('10000000', 'ether'), { from: vester })

    const allowance = web3.utils.fromWei(await bcash.allowance(vester, locker.address))

    console.log('ALLOWANCE', allowance)

    await locker.lock(1000000, { from: vester })

    const amountLocked = parseInt(web3.utils.fromWei(await locker.amountLockedFor(vester)))

    assert.equal(amountLocked, 1000000)
  })

  it("allows a user to claim 50k of their BCash after a vesting period", async () => {

    const vester = accounts[5]

    const bcash = await BCashStub.new()
    const locker = await BCashLocker.new(bcash.address)

    await bcash.mint(vester)

    let balance = web3.utils.fromWei(await bcash.balanceOf(vester))

    console.log('BALANCE', balance)

    await bcash.approve(locker.address, web3.utils.toWei('10000000', 'ether'), { from: vester })

    const allowance = web3.utils.fromWei(await bcash.allowance(vester, locker.address))

    console.log('ALLOWANCE', allowance)

    await locker.lock(1000000, { from: vester })

    let timeRemaining = parseInt(await locker.timeUntilNextClaimFor(vester))

    // assert.equal(amountLocked, 1000000)

    console.log('TIME REMAINING', timeRemaining)

    let claimableAmount = parseInt(web3.utils.fromWei(await locker.amountClaimableFor(vester)))
    console.log('CLAIMABLE', claimableAmount)
    assert.equal(claimableAmount, 0)

    await fastForward(timeRemaining + 1)

    claimableAmount = parseInt(web3.utils.fromWei(await locker.amountClaimableFor(vester)))
    console.log('CLAIMABLE', claimableAmount)
    assert.equal(claimableAmount, 50000)

    timeRemaining = parseInt(await locker.timeUntilNextClaimFor(vester))

    // assert.equal(amountLocked, 1000000)

    console.log('TIME REMAINING', timeRemaining)

    let totalAmountLocked = web3.utils.fromWei(await locker.totalAmountLocked(), 'ether')
    console.log('TOTAL LOCKED', totalAmountLocked)

    await locker.claim({ from: vester })


    totalAmountLocked = web3.utils.fromWei(await locker.totalAmountLocked(), 'ether')
    console.log('TOTAL LOCKED', totalAmountLocked)

    timeRemaining = parseInt(await locker.timeUntilNextClaimFor(vester))
    console.log('TIME REMAINING', timeRemaining)

    balance = parseInt(web3.utils.fromWei(await bcash.balanceOf(vester)))

    assert.equal(balance, 50000)

    await fastForward(timeRemaining + 1)

    timeRemaining = parseInt(await locker.timeUntilNextClaimFor(vester))
    console.log('TIME REMAINING', timeRemaining)

    await locker.claim({ from: vester })

    timeRemaining = parseInt(await locker.timeUntilNextClaimFor(vester))
    console.log('TIME REMAINING', timeRemaining)

    balance = parseInt(web3.utils.fromWei(await bcash.balanceOf(vester)))

    assert.equal(balance, 100000)

    await fastForward(timeRemaining + 1)

    timeRemaining = parseInt(await locker.timeUntilNextClaimFor(vester))
    console.log('TIME REMAINING', timeRemaining)
  })

  it("can handle skipping claims", async () => {
    const vester = accounts[5]

    const bcash = await BCashStub.new()
    const locker = await BCashLocker.new(bcash.address)

    await bcash.mint(vester)

    let balance = web3.utils.fromWei(await bcash.balanceOf(vester))

    console.log('BALANCE', balance)

    await bcash.approve(locker.address, web3.utils.toWei('10000000', 'ether'), { from: vester })

    const allowance = web3.utils.fromWei(await bcash.allowance(vester, locker.address))

    console.log('ALLOWANCE', allowance)

    await locker.lock(1000000, { from: vester })

    let timeRemaining = parseInt(await locker.timeUntilNextClaimFor(vester))

    // assert.equal(amountLocked, 1000000)

    console.log('TIME REMAINING', timeRemaining)

    let claimableAmount = parseInt(web3.utils.fromWei(await locker.amountClaimableFor(vester)))
    console.log('CLAIMABLE', claimableAmount)
    assert.equal(claimableAmount, 0)

    let blockNumber
    let block
    let timestamp

    await bcash.mint(accounts[0])
    await fastForward(2419200)

    await bcash.mint(accounts[0])
    await fastForward(2419200)

    await bcash.mint(accounts[0])
    await fastForward(2419200)

    await bcash.mint(accounts[0])
    await fastForward(2419200)

    await bcash.mint(accounts[0])
    await fastForward(2419200)


    claimableAmount = parseInt(web3.utils.fromWei(await locker.amountClaimableFor(vester)))
    console.log('CLAIMABLE', claimableAmount)
    assert.equal(claimableAmount, 250000)

    timeRemaining = parseInt(await locker.timeUntilNextClaimFor(vester))

    let amountLocked = parseInt(web3.utils.fromWei(await locker.amountLockedFor(vester)))
    assert.equal(amountLocked, 1000000)

    console.log('TIME REMAINING', timeRemaining)

    await locker.claim({ from: vester })

    timeRemaining = parseInt(await locker.timeUntilNextClaimFor(vester))
    console.log('TIME REMAINING', timeRemaining)

    balance = parseInt(web3.utils.fromWei(await bcash.balanceOf(vester)))

    assert.equal(balance, 250000)

    amountLocked = parseInt(web3.utils.fromWei(await locker.amountLockedFor(vester)))

    assert.equal(amountLocked, 750000)
  })

  it("removes a locked account after they have fully claimed", async () => {

    const vester = accounts[5]

    const bcash = await BCashStub.new()
    const locker = await BCashLocker.new(bcash.address)

    await bcash.mint(vester)

    const balance = web3.utils.fromWei(await bcash.balanceOf(vester))

    console.log('BALANCE', balance)

    await bcash.approve(locker.address, web3.utils.toWei('10000000', 'ether'), { from: vester })

    const allowance = web3.utils.fromWei(await bcash.allowance(vester, locker.address))

    console.log('ALLOWANCE', allowance)

    await locker.lock(50000, { from: vester })

    let totalAccountsLocked = parseInt(await locker.totalAccountsLocked())

    assert.equal(totalAccountsLocked, 1)

    const amountLocked = parseInt(web3.utils.fromWei(await locker.amountLockedFor(vester)))

    assert.equal(amountLocked, 50000)

    await fastForward(2419200)

    await locker.claim({ from: vester })

    totalAccountsLocked = parseInt(await locker.totalAccountsLocked())

    assert.equal(totalAccountsLocked, 0)
  })

  it("removes a locked account after they have fully claimed", async () => {

    const vester = accounts[5]
    const vester2 = accounts[6]
    const vester3 = accounts[7]
    const vester4 = accounts[8]

    const bcash = await BCashStub.new()
    const locker = await BCashLocker.new(bcash.address)

    await bcash.mint(vester)
    await bcash.mint(vester2)
    await bcash.mint(vester3)
    await bcash.mint(vester4)

    const balance = web3.utils.fromWei(await bcash.balanceOf(vester))

    console.log('BALANCE', balance)

    await bcash.approve(locker.address, web3.utils.toWei('10000000', 'ether'), { from: vester })
    await bcash.approve(locker.address, web3.utils.toWei('10000000', 'ether'), { from: vester2 })
    await bcash.approve(locker.address, web3.utils.toWei('10000000', 'ether'), { from: vester3 })
    await bcash.approve(locker.address, web3.utils.toWei('10000000', 'ether'), { from: vester4 })

    const allowance = web3.utils.fromWei(await bcash.allowance(vester, locker.address))

    console.log('ALLOWANCE', allowance)

    await locker.lock(50000, { from: vester })
    await locker.lock(50000, { from: vester2 })
    await locker.lock(50000, { from: vester3 })
    await locker.lock(50000, { from: vester4 })

    let totalAccountsLocked = parseInt(await locker.totalAccountsLocked())

    assert.equal(totalAccountsLocked, 4)

    let lockedAccounts = await locker.lockedAccounts()

    assert.equal(lockedAccounts.includes(vester), true)
    assert.equal(lockedAccounts.includes(vester2), true)
    assert.equal(lockedAccounts.includes(vester3), true)
    assert.equal(lockedAccounts.includes(vester4), true)

    await fastForward(2419200)

    await locker.claim({ from: vester3 })

    totalAccountsLocked = parseInt(await locker.totalAccountsLocked())

    assert.equal(totalAccountsLocked, 3)

    lockedAccounts = await locker.lockedAccounts()

    assert.equal(lockedAccounts.includes(vester), true)
    assert.equal(lockedAccounts.includes(vester2), true)
    assert.equal(lockedAccounts.includes(vester3), false)
    assert.equal(lockedAccounts.includes(vester4), true)
  })
})