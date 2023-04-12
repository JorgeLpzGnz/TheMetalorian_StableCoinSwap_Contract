const {
	loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
	decimals,
	addresses,
    calculateDyPassingDx, 
    calculateReward, 
    mintTokens, 
    addRandomLiquidity,
    removeRandomLiquidity, 
    makeRandomSwap, 
    getSwapEstimation, 
    proveRandomSwap,
	getNumber
} = require("../utils/tools")
const { parseEther, hexlify, zeroPad, parseUnits } = ethers.utils
const tokensABI = require("../utils/tokensABI.json")

/**
 * Tests of the pool BUSD - USDT
 * token 1 = sC1 ( stable coin 1 ) = BUSD
 * token 2 = sC2 ( stable coin 2 ) = USDT
 * 
 * In all this tests is used the mainnet stablecoins
 * contracts, the value of some state variable is 
 * changed to allow to mint tokens and make transfers.
 */

describe("Pool BUSD - USDT", function () {

	async function deployMetalorianSwap() {

		const [ owner, otherAccount ] = await ethers.getSigners()

		const sC1 = await ethers.getContractAt(tokensABI, addresses.busd)

		const sC2 = await ethers.getContractAt(tokensABI, addresses.usdt)

		// modify Tokens owners to able to issue token to make tests

		const ownerValue = hexlify( zeroPad(owner.address, 32) )

		// USDT owner ( slot 0 )

		await ethers.provider.send("hardhat_setStorageAt", [addresses.usdt, "0x0", ownerValue]) 

		// set BUSD owner ( slot 4 )

		await ethers.provider.send("hardhat_setStorageAt", [addresses.busd, "0x4", ownerValue])

		// set BUSD supply controller ( slot 8 )

		await ethers.provider.send("hardhat_setStorageAt", [addresses.busd, "0x8", ownerValue])

		const MetalorianSwap = await ethers.getContractFactory("MetalorianSwap");
		const metaSwap = await MetalorianSwap.deploy( sC1.address, sC2.address, "BUSDUSDT_LP", owner.address );

		const amountToMint = parseEther("1000000000000000")

		// issue each token to the owner address

		await sC1.increaseSupply( amountToMint )
		await sC2.issue( amountToMint )

		// aprove the pool to make transfers

		await sC1.approve( metaSwap.address, amountToMint )
		await sC2.approve( metaSwap.address, amountToMint )

		const protocolFee = await metaSwap.protocolFee()
		const tradeFee = await metaSwap.tradeFee()

		return { metaSwap, sC1, sC2, owner, otherAccount, protocolFee, tradeFee };

	}

	describe('constructor', () => {

		describe("- functionalities", () => {

			it("1. Should set the addresses of the tokens 1 ans 2", async () => {

				const { metaSwap, sC1, sC2 } = await loadFixture(deployMetalorianSwap)

				const token1 = await metaSwap.token1()

				const token2 = await metaSwap.token2()

				expect(token1 == sC1.address)

				expect(token2 == sC2.address)

			})

		})

	})

	describe('getPoolInfo', () => {

		describe("- functionalities", () => {

			it("1. Should return the current info", async () => {

				const { metaSwap, sC1, sC2 } = await loadFixture(deployMetalorianSwap)

				// prove initial info

				const currInfo = await metaSwap.getPoolInfo()

				expect( currInfo.token1 ).to.be.equal( sC1.address )
				expect( currInfo.token2 ).to.be.equal( sC2.address )
				expect( currInfo.totalToken1 ).to.be.equal( 0 )
				expect( currInfo.totalToken2 ).to.be.equal( 0 )
				expect( currInfo.totalSupply ).to.be.equal( 0 )
				expect( currInfo.tradeFee ).to.be.equal( 30 )
				expect( currInfo.protocolFee ).to.be.equal( 20 )
				expect( currInfo.maxTradePercentage ).to.be.equal( 1000 )

				const amount1 = parseUnits("1000", decimals )
				const amount2 = parseUnits("1000", decimals )

				await metaSwap.addLiquidity( amount1, amount2 )

				// prove before pool activity

				const newInfo = await metaSwap.getPoolInfo()

				expect( newInfo.token1 ).to.be.equal( sC1.address )
				expect( newInfo.token2 ).to.be.equal( sC2.address )
				expect( newInfo.totalToken1 ).to.be.equal( amount1 )
				expect( newInfo.totalToken2 ).to.be.equal( amount2 )
				expect( newInfo.totalSupply ).to.be.equal( amount1 )
				expect( newInfo.tradeFee ).to.be.equal( 30 )
				expect( newInfo.protocolFee ).to.be.equal( 20 )
				expect( newInfo.maxTradePercentage ).to.be.equal( 1000 )

			})

		})

	})

	describe('setProtocolFee', () => {

		describe("- Errors", () => {

			it("1. Should fail if not owner want to change", async () => {

				const { metaSwap, otherAccount } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.connect( otherAccount ).setProtocolFee( 10 )
				).to.be.reverted

			})

		})

		describe("- functionalities", () => {

			it("1. Should set the new protocol fee", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const initialProtocolFee = await metaSwap.protocolFee()

				expect( initialProtocolFee ).to.be.equal( 20 )

				await metaSwap.setProtocolFee( 10 )

				const newFee = await metaSwap.protocolFee()

				expect( newFee ).to.be.equal( 10 )

			})

		})

	})

	describe('setTradeFee', () => {

		describe("- Errors", () => {

			it("1. Should fail if not owner want to change", async () => {

				const { metaSwap, otherAccount } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.connect( otherAccount ).setTradeFee( 970 )
				).to.be.reverted

			})

		})

		describe("- functionalities", () => {

			it("1. Should set the new trade fee", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const initialFee = await metaSwap.tradeFee()

				expect( initialFee ).to.be.equal( 30 )

				await metaSwap.setTradeFee( 25 )

				const newFee = await metaSwap.tradeFee()

				expect( newFee ).to.be.equal( 25 )

			})

		})

	})

	describe('setFeeRecipient', () => {

		describe("- Errors", () => {

			it("1. Should fail if not owner want to change", async () => {

				const { metaSwap, otherAccount } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.connect( otherAccount ).setFeeRecipient( otherAccount.address )
				).to.be.reverted

			})

			it("1. Should fail if try to set the same than current", async () => {

				const { metaSwap, owner } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.setFeeRecipient( owner.address )
				).to.be.revertedWith("New Recipient can be the same than current")

			})

		})

		describe("- functionalities", () => {

			it("1. Should set the new trade fee", async () => {

				const { metaSwap, owner, otherAccount } = await loadFixture(deployMetalorianSwap)

				const currentRecipient = await metaSwap.feeRecipient()

				expect( currentRecipient ).to.be.equal( owner.address )

				await metaSwap.setFeeRecipient( otherAccount.address )

				expect( await metaSwap.feeRecipient() ).to.be.equal( otherAccount.address )

			})

		})

	})
	
	describe('setMaxTradePercentage', () => {

		describe("- Errors", () => {

			it("1. Should fail if not owner want to change", async () => {

				const { metaSwap, otherAccount } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.connect( otherAccount ).setMaxTradePercentage( 1000 )
				).to.be.reverted

			})

		})

		describe("- functionalities", () => {

			it("1. Should set the new maximum trade percentage", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const initialPercentage = await metaSwap.maxTradePercentage()

				expect( initialPercentage ).to.be.equal( 1000 )

				await metaSwap.setMaxTradePercentage( 2000 )

				const newPercentage = await metaSwap.maxTradePercentage()

				expect( newPercentage ).to.be.equal( 2000 )

			})

		})

	})

	describe('estimateShares', () => {

		describe("- Errors", () => {

			it("1. Should fail if genesis amount isn't equal", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits( "120", decimals )

				const amount2 = parseUnits( "123", decimals )

				await expect(
					metaSwap.estimateShares( amount1, amount2 )
				).to.be.revertedWith("Error: Genesis Amounts must be the same")

			})

			it("2. Should fail if amount has not equivalent value", async () => {

				const { metaSwap, sC1, sC2 } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits( "120000000", decimals )

				const amount2 = parseUnits( "120000000", decimals )

				await metaSwap.addLiquidity( amount1, amount2 )

				await makeRandomSwap( metaSwap, 5, [ sC1, sC2 ] )

				await expect(
					metaSwap.estimateShares( amount1, amount2 )
				).to.be.revertedWith("Error: equivalent value not provided")

			})

			it("3. Should fail if return zero value", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.estimateShares( 0, 0 )
				).to.be.revertedWith("Error: shares with zero value")

			})

		})

		describe("- functionalities", () => {

			it("1. Should return a shares amount", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits( "1200000", decimals )

				const amount2 = parseUnits( "1200000", decimals )

				const shares = await metaSwap.estimateShares( amount1, amount2 )

				expect( shares ).to.be.greaterThan( 0 )

			})

			it("2. Should return a correct amount", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits( "1200000", decimals )

				const amount2 = parseUnits( "1200000", decimals )

				const shares = await metaSwap.estimateShares( amount1, amount2 )

				expect( shares ).to.be.equal( amount1 )

			})

		})

	})

	describe('estimateWithdrawalAmounts', () => {

		describe("- Errors", () => {

			it("1. should fail if pool is not Active", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const shares = parseUnits("120", decimals)

				await expect(
					metaSwap.estimateWithdrawalAmounts( shares )
				).to.be.revertedWith("Error: contract has no funds")

			})

			it("2. should fail if contract has not sufficient shares", async () => {
				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.estimateWithdrawalAmounts(amount1.add(100))
				).to.be.revertedWith("Error: insufficient pool balance")

			})

		})

		describe("- functionalities", () => {

			it( "1. Prove returned value is always the correct", async () => {

				const { metaSwap, otherAccount, sC1, sC2 } = await loadFixture( deployMetalorianSwap )

				// amounts owner to add new liquidity

				const amount1Owner = parseUnits("120000", decimals)
				const amount2Owner = parseUnits("120000", decimals)

				// amounts another account to estimate

				const amount1OtherAccount = parseUnits("50000", decimals)
				const amount2OtherAccount = parseUnits("50000", decimals)

				await metaSwap.addLiquidity(amount1Owner, amount2Owner)

				const [ amount1OutO, amount2OutO ] = await metaSwap.estimateWithdrawalAmounts( amount1Owner )

				// the amounts of the owner must be equal in inactivity pool

				expect( amount1OutO ).to.be.equal( amount1Owner )
				expect( amount2OutO ).to.be.equal( amount2Owner )

				await mintTokens( sC1, otherAccount, getNumber(amount1OtherAccount), metaSwap)
				await mintTokens( sC2, otherAccount, getNumber(amount2OtherAccount), metaSwap)

				// make the same with another account

				await metaSwap.connect( otherAccount ).addLiquidity(amount1OtherAccount, amount2OtherAccount)
				
				const [ amount1OutOA, amount2OutOA ] = await metaSwap.connect( otherAccount ).estimateWithdrawalAmounts( amount1OtherAccount )

				expect( amount1OutOA ).to.be.equal( amount1OtherAccount )
				expect( amount2OutOA ).to.be.equal( amount2OtherAccount )

				// replicate pool activity

				await makeRandomSwap( metaSwap, 20, [ sC1, sC2 ] )

				await addRandomLiquidity( metaSwap, sC1, sC2 )

				await removeRandomLiquidity( metaSwap )

				await makeRandomSwap( metaSwap, 10, [ sC1, sC2 ] )

				await addRandomLiquidity( metaSwap, sC1, sC2 )

				const [ amount1OutOAfter, amount2OutOAfter ] = await metaSwap.estimateWithdrawalAmounts( amount1Owner )

				// estimated value must be greater or equal to initial in an active pool

				expect( amount1OutOAfter.add(amount2OutOAfter)  ).to.be.greaterThanOrEqual( amount1Owner.add(amount2Owner))

			})

		})

	})

	describe('estimateSwap', () => {

		describe("- Errors", () => {

			it("1. Should fail if pass some cero value", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.estimateSwap( 0, 1, 1 )
				).to.be.revertedWith("Swap Error: Input amount with 0 value not valid")

				await expect(
					metaSwap.estimateSwap( 1, 0, 1 )
				).to.be.revertedWith("Swap Error: Input amount with 0 value not valid")

				await expect(
					metaSwap.estimateSwap( 1, 1, 0 )
				).to.be.revertedWith("Swap Error: Input amount with 0 value not valid")

			})

		})

		describe("- functionalities", () => {

			it("1. Should return the amount out", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount = parseUnits( "10", decimals )

				const total1 = parseUnits( "1200000", decimals )

				const total2 = parseUnits( "1200000", decimals )

				const [ ,amountOut, ] = await metaSwap.estimateSwap(
					amount,
					total1,
					total2
				)

				expect( amountOut ).to.be.greaterThan( 0 )

			})

			it("2. Should return the correct value", async () => {

				const { metaSwap, protocolFee, tradeFee } = await loadFixture(deployMetalorianSwap)

				const amount = parseUnits( "10", decimals )

				const total1 = parseUnits( "1200000", decimals )

				const total2 = parseUnits( "1200000", decimals )

				const [ ,amountOut, ] = await metaSwap.estimateSwap(
					amount,
					total1,
					total2
				)

				const estimation = total2.mul( 
					amount.mul( 10000 - ( protocolFee + tradeFee ) ).div( 10000 )
				).div( total1.add( 
					amount.mul( 10000 - ( protocolFee + tradeFee ) ).div( 10000 )) 
				)

				expect( amountOut ).to.be.equal( estimation )

			})

		})

	})

	describe('addLiquidity', () => {

		describe("- Errors", () => {

			it("1. should fail if genesis amount is not equal", async () => {
				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("100", decimals)

				await expect(
					metaSwap.addLiquidity(amount1, amount2)
				).to.be.revertedWith("Error: Genesis Amounts must be the same")

			})

			it("2. should fail if new liquidity are not in the same value", async () => {
				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.addLiquidity(amount1, amount2.sub(2))
				).to.be.revertedWith("Error: equivalent value not provided")

			})

			it("3. should fail if shares value is with zero value", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("0", decimals)
				const amount2 = parseUnits("0", decimals)

				await expect(
					metaSwap.addLiquidity( amount1, amount2 )
				).to.be.revertedWith("Error: shares with zero value")

			})

		})

		describe("- functionalities", () => {

			it( "1. Prove is adding new liquidity", async () => {

				const { metaSwap, sC1, sC2 } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalToken1 = getNumber(await metaSwap.totalToken1())
				const totalToken2 = getNumber(await metaSwap.totalToken2())

				const sC1Balance = getNumber(
					await sC1.balanceOf( metaSwap.address ),
					await sC1.decimals()
				)
				const sC2Balance = getNumber(
					await sC2.balanceOf( metaSwap.address ),
					await sC2.decimals()
				)

				// const k = await metaSwap.k()

				expect( totalToken1 ).to.be.equal( sC1Balance )
				expect( totalToken2 ).to.be.equal( sC2Balance )
				// expect( k ).to.be.equal(totalToken1.mul(totalToken2))

			})

			it( "2. Prove is adding the shares", async () => {

				const { metaSwap, owner, otherAccount, sC1, sC2 } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("500000000", decimals)
				const amount2 = parseUnits("500000000", decimals)

				const amount3 = parseUnits("50", decimals)
				const amount4 = parseUnits("50", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const shares = await metaSwap.balanceOf( owner.address )
				const totalShares = await metaSwap.totalSupply()

				expect( shares ).to.be.equal( amount1 )
				expect( totalShares ).to.be.equal( shares )

				await mintTokens(sC1, otherAccount, getNumber(amount1), metaSwap)
				await mintTokens(sC2, otherAccount, getNumber(amount2), metaSwap)

				await metaSwap.connect(otherAccount).addLiquidity(amount3, amount4)
				const shares2 = await metaSwap.balanceOf( otherAccount.address )
				const totalShares2 = await metaSwap.totalSupply()

				expect( shares2 ).to.be.equal( amount3 )
				expect( totalShares2 ).to.be.equal( shares.add( shares2 ) )

			})

		})

	})

	describe('withdrawLiquidity', () => {

		describe("- Errors", () => {

			it("1. should fail if pool doesn't have funds", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount = parseUnits("120", decimals)

				await expect(
					metaSwap.withdrawLiquidity( amount )
				).to.be.revertedWith("Error: contract has no funds")

			})

			it("2. should fail if amount is with zero value", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.withdrawLiquidity( 0 )
				).to.be.revertedWith("Error: Invalid Amount, value = 0")

			})

			it("3. should fail if user not have sufficient shares", async () => {

				const { metaSwap, otherAccount } = await loadFixture( deployMetalorianSwap )

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.connect(otherAccount).withdrawLiquidity( amount1 )
				).to.be.revertedWith("Error: Insufficient LP balance")

			})

			it("4. should fail if contract not have sufficient shares", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.withdrawLiquidity( amount1.add( amount2 ) )
				).to.be.revertedWith("Error: Insufficient LP balance")

			})

		})

		describe("- functionalities", () => {

			it( "1. Should remove liquidity", async () => {

				const { metaSwap, sC1, sC2, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("12000", decimals)
				const amount2 = parseUnits("12000", decimals)

				await mintTokens( sC1, otherAccount, 12000, metaSwap )
				await mintTokens( sC2, otherAccount, 12000, metaSwap )

				await metaSwap.connect(otherAccount).addLiquidity(amount1, amount2)

				const zbsC1 = await sC1.balanceOf( otherAccount.address )
				const zbsC2 = await sC2.balanceOf( otherAccount.address )

				expect( zbsC1 ).to.be.equal( 0 )
				expect( zbsC2 ).to.be.equal( 0 )

				await metaSwap.connect(otherAccount).withdrawLiquidity( amount1 )

				const bsC1 = getNumber(
					await sC1.balanceOf( otherAccount.address ),
					await sC1.decimals()
				)
				const bsC2 = getNumber(
					await sC2.balanceOf( otherAccount.address ),
					await sC2.decimals()
				)

				expect( bsC1 ).to.be.equal( getNumber(amount1) )
				expect( bsC2 ).to.be.equal( getNumber(amount2) )

			})

			it( "2. Prove is burning the shares", async () => {

				const { metaSwap, owner } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("12000", decimals)
				const amount2 = parseUnits("12000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const sharesBefore = await metaSwap.balanceOf( owner.address )
				const tSharesBefore = await metaSwap.totalSupply()

				expect( sharesBefore ).to.be.equal( tSharesBefore )
				expect( tSharesBefore ).to.be.equal( amount1 )

				await metaSwap.withdrawLiquidity( amount1 )

				const sharesAfter = await metaSwap.balanceOf( owner.address )
				const tSharesAfter = await metaSwap.totalSupply()

				expect( sharesAfter ).to.be.equal( tSharesAfter )
				expect( tSharesAfter ).to.be.equal( 0 )

			})

			it( "3. Should update the balances", async () => {

				const { metaSwap, sC1, sC2 } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("12000", decimals)
				const amount2 = parseUnits("12000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalT1Before = getNumber(await metaSwap.totalToken1())
				const totalT2Before = getNumber(await metaSwap.totalToken2())
				// const kBefore = await metaSwap.k()

				const balanceT1Before = getNumber(
					await sC1.balanceOf( metaSwap.address ),
					await sC1.decimals()
				)

				const balanceT2Before = getNumber(
					await sC2.balanceOf( metaSwap.address ),
					await sC2.decimals()
				)

				expect( totalT1Before ).to.be.equal( balanceT1Before )
				expect( totalT2Before ).to.be.equal( balanceT2Before )
				// expect( kBefore ).to.be.equal( balanceT1Before.mul(balanceT2Before))

				await metaSwap.withdrawLiquidity( amount1 )

				const totalT1After = await metaSwap.totalToken1()
				const totalT2After = await metaSwap.totalToken2()
				// const kAfter = await metaSwap.k()

				const balanceT1After = getNumber(
					await sC1.balanceOf( metaSwap.address ),
					await sC2.decimals()
				)
				const balanceT2After = getNumber(
					await sC2.balanceOf( metaSwap.address ),
					await sC2.decimals()
				)

				// prove the update balances match with contract sC1 / sC2 Balance

				expect( totalT1After ).to.be.equal( balanceT1After )
				expect( totalT2After ).to.be.equal( balanceT2After )
				// expect( kAfter ).to.be.equal( balanceT1After.mul(balanceT2After))

				// those amounts must be cero

				expect( totalT1After ).to.be.equal( 0 )
				expect( totalT2After ).to.be.equal( 0 )
				// expect( kAfter ).to.be.equal( 0)

			})

			it( "4. Prove withdraws over the time", async () => {

				const { metaSwap, owner, otherAccount, sC1, sC2 } = await loadFixture( deployMetalorianSwap )

				// initial investor

				const amount1 = parseUnits("12000000", decimals)
				const amount2 = parseUnits("12000000", decimals)

				// simulate a pool activity

				await metaSwap.addLiquidity(amount1, amount2)

				await addRandomLiquidity( metaSwap, sC1, sC2)

				await makeRandomSwap( metaSwap, 20, [ sC1, sC2 ] )

				await removeRandomLiquidity( metaSwap )

				await addRandomLiquidity( metaSwap, sC1, sC2)

				await makeRandomSwap( metaSwap, 20, [ sC1, sC2 ] )

				await removeRandomLiquidity( metaSwap )

				await makeRandomSwap( metaSwap, 20, [ sC1, sC2 ] )

				// last investor

				const amountsAO = await calculateDyPassingDx( metaSwap, 12000000 )

				await mintTokens( sC1, otherAccount, getNumber(amountsAO[0]), metaSwap)
				await mintTokens( sC2, otherAccount, getNumber(amountsAO[1]), metaSwap)

				await metaSwap
				    .connect( otherAccount )
					.addLiquidity( amountsAO[0], amountsAO[1] )

				// shares balances

				const balanceOwner = await metaSwap.balanceOf( owner.address )
				const balanceOA = await metaSwap.balanceOf( otherAccount. address )

				// withdraw amounts

				const [ _withdraw1, _withdraw2 ] = await metaSwap.estimateWithdrawalAmounts( balanceOwner )

				const [ _withdraw1AO, _withdraw2AO ] = await metaSwap.estimateWithdrawalAmounts( balanceOA )
				// normalize the amount to 6 decimals
				// to handle possible different base decimals

				const withdraw1 = getNumber(_withdraw1)
				const withdraw2 = getNumber(_withdraw2)

				const withdraw1AO = getNumber(_withdraw1AO)
				const withdraw2AO = getNumber(_withdraw2AO)

				const amountAO1 = getNumber(amountsAO[0])
				const amountAO2 = getNumber(amountsAO[1])

				// initial investor must have more than initial amount

				expect( 
					calculateReward( getNumber( amount1.add(amount2)) , withdraw1 + withdraw2 ) 
				).to.be.greaterThan( 0 )

				/**
				 * last investor must have the same quantity
				 * 
				 * But in this case the investor withdraws just 
				 * after adding liquidity, so in this case the person must
				 * withdrawn the same quantity, but due to a possible precision
				 * error when calculating the amount to withdraw , the investor 
				 * may withdraw slightly fewer tokens
				 */

				expect( 
					calculateReward( amountAO1 + amountAO2, withdraw1AO + withdraw2AO )  
				).to.be.lessThanOrEqual( 0 )

			})

		})

	})

	describe('swap', () => {

		describe("- Errors", () => {

			it("1. should fail if pool has no funds", async () => {

				const { metaSwap, sC1 } = await loadFixture( deployMetalorianSwap )

				const amount = parseUnits('1', decimals)

				await expect( 
					metaSwap.swap( sC1.address, amount, 0 )
				).to.be.revertedWith("Error: contract has no funds")

			})

			it("2. Should fail if passed address is not valid", async () => {

				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				const amount = parseUnits('1', decimals)

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( owner.address, amount, 0 )
				).to.be.revertedWith("Trade Error: invalid token")

			})

			it("3. Should fail if passed amount with zero value", async () => {

				const { metaSwap, sC1 } = await loadFixture( deployMetalorianSwap )

				const amount = parseUnits('0', decimals)

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( sC1.address, amount, 0 )
				).to.be.revertedWith("Swap Error: Input amount with 0 value not valid")

			})

			it("4. Should fail if price impact is more than trade limit", async () => {

				const { metaSwap, sC1 } = await loadFixture( deployMetalorianSwap )

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const maxTrade = await metaSwap.maxTrade(amount2)

				const amountIn = amount1.mul( maxTrade ).div( amount2.sub( maxTrade  ))

				await expect( 
					metaSwap.swap( sC1.address, amountIn.add( 1e6 ), 0 )
				).to.be.revertedWith("Swap Error: output value is greater than the limit")

			})

			it("5. Should fail if output amount is less than expected", async () => {

				const { metaSwap, sC1 } = await loadFixture( deployMetalorianSwap )

				const amount1 = parseUnits("120", decimals)
				const amount2 = parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				/**
				 * In this test we simulate an user than tries to swap the same quantity
				 * of tokens but this will not be posible beacuase the output amount, in
				 * the initial state of the pool will be less that the input amount and never
				 * the same
				 */

				const amountIn = parseUnits( "10", 6 )

				await expect( 
					metaSwap.swap( sC1.address, amountIn, amountIn )
				).to.be.revertedWith("Trade Error: Output amount is less than expected")

			})

		})

		describe("- functionalities", () => {

			it( "1. Make a Swap of token 1 for toke 2", async () => {

				const { metaSwap, sC1, sC2, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount = parseUnits('120', decimals)

				const amount1 = parseUnits("50000000", decimals)
				const amount2 = parseUnits("50000000", decimals)

				await mintTokens( sC1, otherAccount, getNumber(amount), metaSwap )

				const bsC1Before = getNumber(
					await sC1.balanceOf( otherAccount.address ),
					await sC1.decimals()
				)
				const bsC2Before = getNumber(
					await sC2.balanceOf( otherAccount.address ),
					await sC2.decimals()
				)

				// prove balances

				expect( bsC1Before ).to.be.equal( getNumber(amount) )
				expect( bsC2Before ).to.be.equal( 0 )

				await metaSwap.addLiquidity(amount1, amount2)

				const [ , swapEstimate, ] = await getSwapEstimation( metaSwap, amount, "sC1" )

				// to calculate the min amount out we just rest the 2% to the input amount
				// this minOut you can calculate it by the way that you prefer

				const minOutputAmount = amount.sub( amount.mul( 2 ).div( 100 ))

				await metaSwap.connect( otherAccount ).swap( sC1.address, amount, minOutputAmount )

				const bsC1After = getNumber(
					await sC1.balanceOf( otherAccount.address ),
					await sC1.decimals()
				)
				const bsC2After = getNumber(
					await sC2.balanceOf( otherAccount.address ),
					await sC2.decimals()
				)

				expect( bsC1After ).to.be.equal( 0 )
				expect( bsC2After ).to.be.equal( getNumber(swapEstimate) )

			})

			it( "2. Make a Swap of token 2 for token 1", async () => {

				const { metaSwap, sC1, sC2, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount = parseUnits('120', decimals)

				const amount1 = parseUnits("50000000", decimals)
				const amount2 = parseUnits("50000000", decimals)

				await mintTokens( sC2, otherAccount, getNumber(amount), metaSwap )

				const bsC1Before = getNumber(
					await sC1.balanceOf( otherAccount.address ),
					await sC1.decimals()
				)
				const bsC2Before = getNumber(
					await sC2.balanceOf( otherAccount.address ),
					await sC2.decimals()
				)

				expect( bsC2Before ).to.be.equal( getNumber(amount) )
				expect( bsC1Before ).to.be.equal( 0 )

				await metaSwap.addLiquidity(amount1, amount2)

				const [ , swapEstimate, ] = await getSwapEstimation( metaSwap, amount, "sC2" )
				await metaSwap.connect( otherAccount ).swap( sC2.address, amount, 0 )

				const bsC1After = getNumber(
					await sC1.balanceOf( otherAccount.address ),
					await sC1.decimals()
				)
				const bsC2After = getNumber(
					await sC2.balanceOf( otherAccount.address ),
					await sC2.decimals()
				)

				expect( bsC2After ).to.be.equal( 0 )
				expect( bsC1After ).to.be.equal( getNumber(swapEstimate) )

			})

			it( "3. updating balances swapping token 1 for token 2", async () => {

				const { metaSwap, sC1, sC2, protocolFee } = await loadFixture(deployMetalorianSwap)

				const amount = parseUnits('120', decimals)

				const amount1 = parseUnits("50000000", decimals)
				const amount2 = parseUnits("50000000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalT1Before = getNumber(await metaSwap.totalToken1())
				const totalT2Before = getNumber(await metaSwap.totalToken2())

				const bsC1Before = getNumber(
					await sC1.balanceOf( metaSwap.address ),
					await sC1.decimals()
				)
				const bsC2Before = getNumber(
					await sC2.balanceOf( metaSwap.address ),
					await sC2.decimals()
				)

				// check swap balances update

				expect( getNumber( amount1 ) ).to.be.equal( totalT1Before )
				expect( getNumber( amount2 ) ).to.be.equal( totalT2Before )
				expect( bsC1Before ).to.be.equal( totalT1Before )
				expect( bsC2Before ).to.be.equal( totalT2Before )

				const [ ,swapEstimate ] = await getSwapEstimation( metaSwap, amount, "sC1" )
				await metaSwap.swap( sC1.address, amount, 0 )

				const totalT1After = getNumber(await metaSwap.totalToken1())
				const totalT2After = getNumber(await metaSwap.totalToken2())

				const bsC1After = getNumber(
					await sC1.balanceOf( metaSwap.address ),
					await sC1.decimals()
				)
				const bsC2After = getNumber(
					await sC2.balanceOf( metaSwap.address ),
					await sC2.decimals()
				)

				const fee = getNumber( amount.mul( 10000 - protocolFee ).div( 10000 ) )

				expect( bsC1After ).to.be.equal( totalT1After )
				expect( bsC2After ).to.be.equal( totalT2After )
				// x + dx
				expect( totalT1Before + fee ).to.be.equal( totalT1After )
				// y - dy
				expect( totalT2Before - getNumber( swapEstimate ) ).to.be.equal( totalT2After )

			})

			it( "4. updating balances swapping token 2 for token 1", async () => {

				const { metaSwap, sC1, sC2, protocolFee } = await loadFixture( deployMetalorianSwap )

				const amount = parseUnits('120', decimals)

				const amount1 = parseUnits("50000000", decimals)
				const amount2 = parseUnits("50000000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalT1Before = getNumber(await metaSwap.totalToken1())
				const totalT2Before = getNumber(await metaSwap.totalToken2())

				const bsC1Before = getNumber(
					await sC1.balanceOf( metaSwap.address ),
					await sC1.decimals()
				)
				const bsC2Before = getNumber(
					await sC2.balanceOf( metaSwap.address ),
					await sC2.decimals()
				)

				// check swap balances update

				expect( getNumber( amount1 ) ).to.be.equal( totalT1Before )
				expect( getNumber( amount2 ) ).to.be.equal( totalT2Before )
				expect( bsC1Before ).to.be.equal( totalT1Before )
				expect( bsC2Before ).to.be.equal( totalT2Before )

				const [ ,swapEstimate ] = await getSwapEstimation( metaSwap, amount, "sC2" )
				await metaSwap.swap( sC2.address, amount, 0 )

				const totalT1After = getNumber(await metaSwap.totalToken1())
				const totalT2After = getNumber(await metaSwap.totalToken2())

				const bsC1After = getNumber(
					await sC1.balanceOf( metaSwap.address ),
					await sC1.decimals()
				)
				const bsC2After = getNumber(
					await sC2.balanceOf( metaSwap.address ),
					await sC2.decimals()
				)

				const fee = getNumber(amount.mul( 10000 - protocolFee ).div( 10000 ))

				expect( bsC1After ).to.be.equal( totalT1After )
				expect( bsC2After ).to.be.equal( totalT2After )
				// x - dx
				expect( totalT1Before - getNumber(swapEstimate) ).to.be.equal( totalT1After )
				// y + dy
				expect( totalT2Before + fee ).to.be.equal( totalT2After )

			})

			it( "5. Prove return value", async () => {

				const { metaSwap, sC1, sC2 } = await loadFixture(deployMetalorianSwap)

				const amount1 = parseUnits("50000000", decimals)
				const amount2 = parseUnits("50000000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const prove = await proveRandomSwap( metaSwap, [ sC1, sC2 ])

				expect( prove ).to.be.true

			})

			it( "6. Prove owner is receiving the swap rewards", async () => {

				const { metaSwap, sC1, owner, protocolFee, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount = parseUnits("1000", decimals)

				const fee = getNumber(amount.mul( protocolFee ).div( 10000 ))

				const amount1 = parseUnits("50000000", decimals)
				const amount2 = parseUnits("50000000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const balanceBefore = getNumber(
					await sC1.balanceOf( owner.address ),
					await sC1.decimals()
				)

				await mintTokens( sC1, otherAccount, getNumber(amount), metaSwap)

				await metaSwap.connect( otherAccount ).swap( sC1.address, amount, 0)

				const balanceAfter = getNumber(
					await sC1.balanceOf( owner.address ),
					await sC1.decimals()
				)

				expect( balanceBefore + fee ).to.be.equal( balanceAfter )

			})

		})

	})

	describe("Events", () => {

		describe("- Functionalities", () => {

			it("1. NewLiquidity", async () => {
				
				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				const amount1 = parseUnits( "100000", decimals )
				const amount2 = parseUnits( "100000", decimals )

				await expect(
					metaSwap.addLiquidity( amount1, amount2)
				).to.emit( metaSwap, "NewLiquidity" ).withArgs( owner.address, amount1, amount2, amount1, amount1 )
				
			})

			it("2. LiquidityWithdrawal", async () => {
				
				const { metaSwap, owner } = await  loadFixture( deployMetalorianSwap )

				const amount1 = parseUnits( "100000", decimals )
				const amount2 = parseUnits( "100000", decimals )

				await metaSwap.addLiquidity( amount1, amount2)

				await expect(
					metaSwap.withdrawLiquidity( amount1 )
				).to.emit( metaSwap, "LiquidityWithdrawal" ).withArgs( owner.address, amount1, amount2, amount1, 0 )
			
			})

			it("3. Swap", async () => {
				
				const { metaSwap, owner, sC1, protocolFee, tradeFee  } = await  loadFixture( deployMetalorianSwap )

				const amount = parseUnits( "10", decimals )

				const amount1 = parseUnits( "100000", decimals )
				const amount2 = parseUnits( "100000", decimals )

				await metaSwap.addLiquidity( amount1, amount2)

				const amountOut = amount2.mul( 
					amount.mul( 10000 - ( protocolFee + tradeFee ) ).div( 10000 )
				).div( amount1.add( 
					amount.mul( 10000 - ( protocolFee + tradeFee )).div( 10000 )) 
				)

				const creatorFee = amount.mul( protocolFee ).div( 10000 )

				await expect(
					metaSwap.swap( sC1.address, amount, 0 )
				).to.emit( metaSwap, "Swap" ).withArgs( owner.address, creatorFee, amount.sub( creatorFee ), amountOut )

			})

			it("4. NewTradeFee", async () => {
				
				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				await expect(
					metaSwap.setTradeFee( 800 )
				).to.emit( metaSwap, "NewTradeFee" ).withArgs( owner.address, 800 )
			})

			it("5. NewMaxTradePercentage", async () => {
				
				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				await expect(
					metaSwap.setMaxTradePercentage( 100 )
				).to.emit( metaSwap, "NewMaxTradePercentage" ).withArgs( owner.address, 100 )
			})

			it("6. NewProtocolFee", async () => {
				
				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				await expect(
					metaSwap.setProtocolFee( 10 )
				).to.emit( metaSwap, "NewProtocolFee" ).withArgs( owner.address, 10 )
			})

			it("7. NewFeeRecipient", async () => {
				
				const { metaSwap, otherAccount } = await loadFixture( deployMetalorianSwap )

				await expect(
					metaSwap.setFeeRecipient( otherAccount.address )
				).to.emit( metaSwap, "NewFeeRecipient" ).withArgs( otherAccount.address )
			})

		})

	})

});
