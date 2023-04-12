const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = ethers.utils

// the decimals precition used in the pool

const decimals = 6

// Mainnet StableCoins addresses

const addresses = {
	usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
	usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
	busd: "0x4Fabb145d64652a948d72533023f6E7A623C7C53",
	dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
}

// this reuturn how much dx and dy pass to addLiquidity func 

async function calculateDyPassingDx( metaSwap, _amount1 ) {

	const amount1 = ethers.utils.parseUnits( `${ _amount1 }`, decimals)

	const totalToken1 = await metaSwap.totalToken1()
	
	const totalToken2 = await metaSwap.totalToken2()

	if ( totalToken1 == 0 && totalToken2 == 0 ) return [ amount1, amount1 ]

	const amount2 = totalToken2.mul( amount1 ).div( totalToken1 )

	return [ amount1, amount2 ]

}

// this returns the porcentage of reward in the pool

function calculateReward( initialValue, finalValue) {

	const diference = finalValue - initialValue

	const percentage = ( diference / initialValue ) * 100 

	return percentage

}

// use to mint the pased token

async function mintTokens(token, account, _amount, metaSwap) {

	const amount = parseUnits(`${ _amount}`, await token.decimals() )

	// const amount = ethers.utils.parseUnits(`${qty}`, decimals)

	switch (token.address) {
		case addresses.usdt:

			// issue tokens and transfer to the account

			await token.issue( amount )

			await token.transfer( account.address, amount )

			break;

		case addresses.usdc:

			// to mint in USDC is necesary to configurate a minter

			await token.configureMinter( account.address, amount )

			await token.connect(account).mint( account.address, amount )

			break;

		case addresses.busd:

			// mint BUSD and transfer to the account

			await token.increaseSupply( amount )

			await token.transfer( account.address, amount )

			break;

		/**
		 * defualt is DAI becouse this the address will always change
		 * becouse is depleyed a copy in the tests
		 */

		default:

			// mint Dai

			await token.mint( account.address, amount )

			break;

	}

	// increase pool allowance

	await token.connect(account).approve(metaSwap.address, amount)

	return amount

}

// this will add randomly liquidity

async function addRandomLiquidity( metaSwap, sC1, sC2 ) {

	const signers = await ethers.getSigners()

	for (let i = 2; i < signers.length; i++) {

		const random = Math.round( (Math.random() * 10000) + 1 )

		const amounts = await calculateDyPassingDx( metaSwap, random)

		await mintTokens( sC1, signers[i], getNumber(amounts[0]), metaSwap )

		await mintTokens( sC2, signers[i], getNumber(amounts[1]), metaSwap )
		
		await metaSwap.connect(signers[i]).addLiquidity( amounts[0], amounts[1])
		
	}

}

// this will remove randomly liquidity

async function removeRandomLiquidity( metaSwap ) {

	const signers = await ethers.getSigners()

	for (let i = 2; i < signers.length; i++) {

		const shares = await metaSwap.balanceOf( signers[i].address )
		
		await metaSwap
		    .connect(signers[i])
			.withdrawLiquidity( shares.div( 2 ) )
		
	}
	
}

// this will wake random swaps betwen toke1 and token2 and vice versa

async function makeRandomSwap( metaSwap, swapsQty, tokens ) {

	const signers = await ethers.getSigners()

	let signer = 2

	for (let i = 0; i < swapsQty; i++) {

		if( signer == 19 ) signer = 2

		const provider = ethers.provider

		/**
		 * the tokens argument is an array with the 2 tokens, 
		 * so we take randomly one of those
		 */

		const token = tokens[ Math.round( Math.random() ) ]

		// randomly take a number between 1 and 1000

		const amointIn = Math.round( Math.random() * 1000 + 1 )

		/**
		 * the Amount to swap is different of the amount to mint
		 * because in the token contract we need to mint the tokens in 
		 * base tokenDecimals, but in the pool contract all calculations are 
		 * done in base 6
		 */

		const amountToSwap = ethers.utils.parseUnits(
			`${ amointIn }`, 
			decimals
		)

		// Mint the tokens to the acount that will interact with the pool

		await mintTokens( token, signers[signer], amointIn, metaSwap )

		// make the swap

		await metaSwap.connect( signers[signer] ).swap( token.address, amountToSwap, 0 )

		signer++
		
	}
}

// this handle wich is the total token in and total token out

async function getSwapEstimation( metaSwap, amountIn, tokenIn ) {

	let totalTokenIn, totalTokenOut

	if( tokenIn == "sC1"){

		totalTokenIn = await metaSwap.totalToken1()
		
		totalTokenOut = await metaSwap.totalToken2()

	} else {
	
		totalTokenIn = await metaSwap.totalToken2()
	
		totalTokenOut = await metaSwap.totalToken1()

	}
	
	return await metaSwap.estimateSwap( amountIn, totalTokenIn, totalTokenOut )

}

function min( x, y) {

	return x < y ? x : y

}

function max( x, y) {

	return x > y ? x : y
	
}

function handlePrecition( x, y) {

	if ( x == y) return true

	return min( x, y ) + 1 == max( x, y)

}

// this prove the returnal value of aleatories swaps

async function proveRandomSwap( metaSwap, tokens ) {

	const signers = await ethers.getSigners()

	const isEqual = []

	const tradeFee = await metaSwap.tradeFee()

	const protocolFee = await metaSwap.protocolFee()

	for (let i = 1; i < signers.length; i++) {

		const amount = ethers.utils.parseUnits( `${ Math.round( Math.random() * 1000 + 1 ) }`, decimals);

		const totalToken1 = await metaSwap.totalToken1()
		const totalToken2 = await metaSwap.totalToken2()

		const { tokenIn, tokenOut, totalIn, totalOut } = Math.round( Math.random() ) == 1
		    ? ({ tokenIn: tokens[0], tokenOut: tokens[1], totalIn: totalToken1, totalOut: totalToken2 }) 
			: ({ tokenIn:  tokens[1], tokenOut: tokens[0], totalIn: totalToken1, totalOut: totalToken2 })

		const amountWithFee = amount.mul( 10000 - ( tradeFee + protocolFee ) ).div( 10000 )

		const decimalsIn = ( await tokenIn.decimals() ) - 6

		const decimalsOut = ( await tokenOut.decimals() ) - 6 

		const amountOut = totalOut.mul( amountWithFee ).div( totalIn.add( amountWithFee ) )

		await mintTokens( tokenIn, signers[i] , getNumber(amount.mul( 10 ** decimalsIn )), metaSwap )

		await metaSwap.connect( signers[i] ).swap( tokenIn.address, amount, 0)

		const balance = await tokenOut.balanceOf( signers[i].address )

        isEqual.push( 
			handlePrecition( 
				Math.round( Number( ethers.utils.formatUnits( amountOut, decimals ) ) ),
				Math.round( Number( ethers.utils.formatUnits( balance.div( 10 ** decimalsOut ), decimals ) ) ) 
			)
		)
		
	}

	return isEqual.every( e => e == true)

}

function getNumber( BigNumber, decimals = 6 ) {

	return Number( formatUnits( BigNumber, decimals ) )
}

module.exports = {
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
}