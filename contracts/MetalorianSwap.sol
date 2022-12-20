// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract MetalorianSwap is ERC20 {

    IERC20 public immutable token1; // USDT

    IERC20 public immutable token2; // USDC

    uint public totalToken1;

    uint public totalToken2;

    uint public k; // constant product 

    event NewLiquidity( address liquidityProvider, uint amountToken1, uint amountToken2 );

    event LiquidityWithdraw( address liquidityProvider, uint amountToken1, uint amountToken2 );

    event Swap( address user, uint amountIn, uint amountOut);

    constructor (address _token1Address, address _token2Address) ERC20("Shares USDT USDC", "USDT/USDC.LP") {

        token1 = IERC20( _token1Address );

        token2 = IERC20( _token2Address );

    }

    function decimals() public pure override returns( uint8 ) {

        return 6;
        
    }

    modifier isActive {

        require( totalSupply() > 0, "Error: contract has no founds");

        _;

    }

    modifier checkShares( uint _amount) {

        require( _amount > 0, "Error: Invalid Amount, value = 0");
        
        require( balanceOf( msg.sender ) >= _amount, "Error: your not an LP");

        _;

    }

    function _min( uint x, uint y ) private pure returns( uint ) {

        return x <= y ? x : y;

    }

    function _max( uint x, uint y ) private pure returns( uint ) {

        return x >= y ? x : y;

    }

    function _updateBalances( uint _amountToken1, uint _amountToken2) private {

        totalToken1 = _amountToken1;

        totalToken2 = _amountToken2;

        k = _amountToken1 * _amountToken2;

    }

    function _handlePrecition( uint _amount1, uint _amount2 ) private pure returns( bool ) {

        if ( _amount1 == _amount2) return true;

        else return _min( _amount1, _amount2) + 1 == _max( _amount1, _amount2);

    }

    function estimateShares( uint _token1, uint _token2 ) public view returns ( uint _shares ) {

        if( totalSupply() == 0) {

            require( _token1 == _token2, "Error: Genesis Amounts must be the same" );

            _shares = _token1;

        } else {

            uint share1 = (_token1 * totalSupply()) / totalToken1;

            uint share2 = (_token2 * totalSupply()) / totalToken2;

            require( _handlePrecition( share1, share2) , "Error: equivalent value not provided");
            
            _shares = _min( share1, share2 );
            
        }

        require( _shares > 0, "Error: shares with zero value" );
        
    }

    function estimateWithdrawAmounts( uint _shares ) public view isActive returns( uint amount1, uint amount2 ) {

        require ( _shares <= totalSupply(), "Error: insuficent shares");

        amount1 = ( totalToken1 * _shares ) / totalSupply();

        amount2 = ( totalToken2 * _shares ) / totalSupply();

    }

    function estimateSwap( uint _amountIn, uint _totalTokenIn, uint _totalTokenOut ) public pure returns ( uint amountOut ) {

        require( _amountIn > 0 && _totalTokenIn > 0 && _totalTokenOut > 0, "Swap Eror: Invalid input amount with value 0 ");

        uint amountInWithFee = ( _amountIn * 997 ) / 1000;

        amountOut = ( _totalTokenOut * amountInWithFee ) / ( _totalTokenIn + amountInWithFee );

    }

    function addLiquidity( uint _token1, uint _token2 ) public returns ( uint _shares )  {

        _shares = estimateShares( _token1, _token2 );

        require(token1.transferFrom( msg.sender, address( this ), _token1 ));

        require(token2.transferFrom( msg.sender, address( this ), _token2 ));

        _mint( msg.sender, _shares );

        _updateBalances( totalToken1 + _token1, totalToken2 + _token2 );

        emit NewLiquidity( msg.sender, _token1, _token2 );

    }

    function removeLiquidity( uint _shares ) public isActive checkShares( _shares ) {

        ( uint amount1, uint amount2 ) = estimateWithdrawAmounts( _shares );

        require( amount1 > 0 && amount2 > 0, "Error: amounts with zero value");

        require( token1.transfer( msg.sender, amount1 ) );

        require( token2.transfer( msg.sender, amount2 ) );

        _burn( msg.sender, _shares);

        _updateBalances( totalToken1 - amount1, totalToken2 - amount2 );

        emit LiquidityWithdraw( msg.sender, amount1, amount2 );

    }

    function swap( address _tokenIn, uint _amountIn ) public isActive {

        require( _tokenIn == address(token1) || _tokenIn == address(token2), "Error: invalid token");

        bool isToken1 = _tokenIn == address(token1);

        ( IERC20 tokenIn, IERC20 tokeOut, uint _totalTokenIn, uint _totalTokenOut ) = isToken1 
            ? ( token1, token2, totalToken1, totalToken2 )
            : ( token2, token1, totalToken2, totalToken1 );

        uint amountOut = estimateSwap( _amountIn, _totalTokenIn, _totalTokenOut );

        require( _amountIn / amountOut < 2, "Swap Error: Price impact is more than 2x");

        require( tokenIn.transferFrom( msg.sender, address( this ), _amountIn));

        require( tokeOut.transfer( msg.sender, amountOut ));

        if ( isToken1 ) _updateBalances( totalToken1 + _amountIn, totalToken2 - amountOut );

        else _updateBalances( totalToken1 - amountOut, totalToken2 + _amountIn );

        emit Swap( msg.sender, _amountIn ,amountOut);

    }

}
