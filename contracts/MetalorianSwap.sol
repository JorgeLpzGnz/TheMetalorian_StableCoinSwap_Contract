// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
// import "hardhat/console.sol";

contract MetalorianSwap {

    IERC20 public immutable token1; // USDT

    IERC20 public immutable token2; // USDC

    uint public totalToken1;

    uint public totalToken1;

    uint public k; // constant product 

    uint public totalShares;

    mapping (address => uint) shares;

    constructor (address _token1Address, address _token2Address) {

        token1 = IERC20( _token1Address );

        token2 = IERC20( _token2Address );

    }

    modifier isActive {

        require( totalShares > 0, "Error: contract has no founds");

        _;

    }

    modifier isLP {
        
        require( shares[ msg.sender ] > 0, "Error: your not an LP");

        _;
    }

    function addLiquidity( uint _token1, uint _token2 )  returns ( uint _token1, uint _token2 ) {

        if( totalShares == 0) require( _token1 == _token2, "Error: amounts must be the same" );

        else require( totalToken1 * _token2 == totalToken2 * _token1, "Error: equivalent value not provided");

    }

    function removeLiquidity( uint _shares ) public {}

    function swap( address _token1, uint _amountIn ) public {}

}
