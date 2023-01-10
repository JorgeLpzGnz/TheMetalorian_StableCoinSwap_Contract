// the decimals precition used in the pool

const decimals = 6

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

function calculateReward( totalInicial, terminalTotal) {

	const inicial = Number( ethers.utils.formatUnits(totalInicial, decimals))

	const terminal = Number( ethers.utils.formatUnits(terminalTotal, decimals))

	const diference = terminal - inicial

	return Math.round((( diference  * 100) / inicial) * 1000) / 1000

}

// use to mint the pased token

async function mintTokens(token, account, amount, metaSwap) {

	// const amount = ethers.utils.parseUnits(`${qty}`, decimals)

	await token.connect(account).mint(amount)

	await token.connect(account).approve(metaSwap.address, amount)

	return amount

}

// this will add randomly liquidity

async function addRandomLiquidity( metaSwap, USDT, USDC ) {

	const signers = await ethers.getSigners()

	for (let i = 2; i < signers.length; i++) {

		const random = Math.round( (Math.random() * 10000) + 1 )

		const amounts = await calculateDyPassingDx( metaSwap, random)

		await mintTokens( USDT, signers[i], amounts[0], metaSwap )

		await mintTokens( USDC, signers[i], amounts[1], metaSwap )
		
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

		const amount = ethers.utils.parseUnits(
			`${  Math.round( Math.random() * 1000 + 1 ) }`, decimals
		)

		const token = tokens[ Math.round( Math.random() ) ]

		await mintTokens( token, signers[signer], amount, metaSwap )

		const tx = await metaSwap.connect( signers[signer] ).swap( token.address, amount)

		signer++
		
	}
}

// this handle wich is the total token in and total token out

async function getSwapEstimation( metaSwap, amount, tokenIn ) {

	let totalTokenIn, totalTokenOut

	if( tokenIn == "USDT"){

		totalTokenIn = await metaSwap.totalToken1()
		
		totalTokenOut = await metaSwap.totalToken2()

	} else {
	
		totalTokenIn = await metaSwap.totalToken2()
	
		totalTokenOut = await metaSwap.totalToken1()

	}
	
	return await metaSwap.estimateSwap( amount, totalTokenIn, totalTokenOut )

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

		await mintTokens( tokenIn, signers[i] , amount.mul( 10 ** decimalsIn ), metaSwap )

		await metaSwap.connect( signers[i] ).swap( tokenIn.address, amount)

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

module.exports = {
    decimals,
    calculateDyPassingDx, 
    calculateReward, 
    mintTokens, 
    addRandomLiquidity,
    removeRandomLiquidity, 
    makeRandomSwap, 
    getSwapEstimation, 
    proveRandomSwap
}