// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "hardhat/console.sol";

contract MetalorianSwap {

    IERC20 public immutable token1; // USDT

    IERC20 public immutable token2; // USDC

    uint public totalToken1;

    uint public totalToken2;

    uint public k; // constant product 

    uint public totalShares;

    mapping (address => uint) public shares;

    constructor (address _token1Address, address _token2Address) {

        token1 = IERC20( _token1Address );

        token2 = IERC20( _token2Address );

    }

    modifier isActive {

        require( totalShares > 0, "Error: contract has no founds");

        _;

    }

    modifier checkShares( uint _amount) {

        require( _amount > 0, "Error: Invalid Amount, value = 0");
        
        require( shares[ msg.sender ] >= _amount, "Error: your not an LP");

        _;

    }

    function _mint( address _account, uint _amount ) private {

        totalShares += _amount;

        shares[ _account ] += _amount;

    }

    function _burn( address _account, uint _amount ) private {

        totalShares -= _amount;

        shares[ _account ] -= _amount;
    }

    function _min( uint x, uint y ) private pure returns( uint ) {

        return x <= y ? x : y;

    }

    function _updateBalances( uint _amountToken1, uint _amountToken2) private {

        console.log(_amountToken1, _amountToken2);

        totalToken1 = _amountToken1;

        totalToken2 = _amountToken2;

        k = _amountToken1 * _amountToken2;

    }

    function estimateWithdrawAmounts( uint _shares ) public view isActive returns( uint amount1, uint amount2 ) {

        require ( _shares <= totalShares, "Error: insuficent shares");

        amount1 = ( totalToken1 * _shares ) / totalShares;

        amount2 = ( totalToken2 * _shares ) / totalShares;

    }

    function estimateSwap( uint _amountIn ) public view returns ( uint amountOut ) {

        uint amountWithFee = ( _amountIn * 997 ) / 1000;

        amountOut = ( totalToken2 * amountWithFee ) / ( totalToken1 + amountWithFee );

    }

    function estimateShares( uint _token1, uint _token2 ) public view returns ( uint _shares ) {

        if( totalShares == 0) {

            require( _token1 == _token2, "Error: Genesis Amounts must be the same" );

            _shares = _token1;

        } else {

            require( totalToken1 * _token2 == totalToken2 * _token1, "Error: equivalent value not provided");
            
            _shares = _min(
                (_token1 * totalShares) / totalToken1,
                (_token2 * totalShares) / totalToken2
            );
            
        }
        
    }

    function addLiquidity( uint _token1, uint _token2 ) public returns ( uint _shares )  {

        _shares = estimateShares( _token1, _token2 );

        require(token1.transferFrom( msg.sender, address( this ), _token1 ));

        require(token2.transferFrom( msg.sender, address( this ), _token2 ));

        _mint( msg.sender, _shares );

        _updateBalances( token1.balanceOf(address(this)), token2.balanceOf(address(this)) );

    }

    function removeLiquidity( uint _shares ) public isActive checkShares( _shares ) {

        ( uint amount1, uint amount2 ) = estimateWithdrawAmounts( _shares );

        require( amount1 > 0 && amount2 > 0, "Error: amounts with zero value");

        require( token1.transfer( msg.sender, amount1 ) );

        require( token2.transfer( msg.sender, amount2 ) );

        _burn( msg.sender, _shares);

        _updateBalances( token1.balanceOf(address(this)), token2.balanceOf(address(this)) );

    }

    function swap( address _tokenIn, uint _amountIn ) public isActive {

        require( _tokenIn == address(token1) || _tokenIn == address(token2), "Error: invalid token");

        require( _amountIn > 0, "Swap Eror: Invalid input amount with value 0 ");

        uint amountOut = estimateSwap( _amountIn );

        require( _amountIn / amountOut < 2, "Swap Error: Price impact is more than 2x");

        bool isToken1 = _tokenIn == address(token1);

        ( IERC20 tokenIn, IERC20 tokeOut ) = isToken1 
            ? ( token1, token2 )
            : ( token2, token1 );

        require( tokenIn.transferFrom( msg.sender, address( this ), _amountIn));

        require( tokeOut.transfer( msg.sender, amountOut ));

        _updateBalances( token1.balanceOf(address(this)), token2.balanceOf(address(this)) );

    }

}
