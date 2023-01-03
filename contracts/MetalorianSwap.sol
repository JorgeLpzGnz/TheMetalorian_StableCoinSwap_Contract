// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

/// @title MetalorianSwap a USD stablecoin Pool
/// @notice A Liquidity protocol based in the CPAMM ( Constant product Automated Market Maker ) 
contract MetalorianSwap is ERC20, Ownable {

    /**************************************************************/
    /********************* POOL DATA ******************************/

    IERC20Metadata public immutable token1; 

    IERC20Metadata public immutable token2; 

    //// @notice the total reserves of the token 1
    uint public totalToken1;

    //// @notice the total reserves of the token 2
    uint public totalToken2;

    //// @dev Constant product not required in this CPAMM model
    //// @notice const product
    // uint public k;

    //// @notice fee charge per trade designated to LP
    uint16 public tradeFee = 30;

    //// @notice fee charge per trade designated to protocol creator
    uint16 public protocolFee = 5;

    //// @notice the maximum tradable percentage of the reserves
    //// @dev that maximum will be this settable percentage of the respective token reserves
    uint16 public maxTradePercentage = 1000;

    //// @notice all the pool info ( used in getPoolInfo )
    struct PoolInfo {
        IERC20Metadata token1;
        IERC20Metadata token2;
        uint totalToken1;
        uint totalToken2;
        uint16 tradeFee;
        uint16 protocolFee;
        uint16 maxTradePercentage;
    }

    /**************************************************************/
    /*************************** EVENTS ***************************/

    //// @param owner contract owner address
    //// @param newProtocolFee new creator fee
    event NewProtocolFee( address owner, uint16 newProtocolFee );

    //// @param owner contract owner address
    //// @param newTradeFee new fee cost per trade
    event NewTradeFee( address owner, uint16 newTradeFee );

    //// @param owner contract owner address
    //// @param newTradePercentage new maximum tradable percentage of the reserves
    event NewMaxTradePercentage( address owner, uint16 newTradePercentage );
    
    //// @param liquidityProvider user deposit address
    //// @param amountToken1 amount of the first token
    //// @param amountToken2 amount of the second token
    event NewLiquidity( address liquidityProvider, uint amountToken1, uint amountToken2 );

    //// @param liquidityProvider user withdraw address
    //// @param amountToken1 amount provided of the first token
    //// @param amountToken2 amount provided of the second token
    event LiquidityWithdraw( address liquidityProvider, uint amountToken1, uint amountToken2 );

    //// @param user user trade address
    //// @param amountIn incoming amount 
    //// @param amountOut output amount
    event Swap( address user, uint amountIn, uint amountOut);

    //// @param _token1Address address of the first stablecoin 
    //// @param _token2Address address of the second stablecoin 
    //// @param _name the name and symbol of the LP tokens
    constructor (address _token1Address, address _token2Address, string memory _name) ERC20( _name, _name ) {

        token1 = IERC20Metadata( _token1Address );

        token2 = IERC20Metadata( _token2Address );

    }

    /**************************************************************/
    /************************** MODIFIERS *************************/

    //// @notice it checks if the pool have founds 
    modifier isActive {

        require( totalSupply() > 0, "Error: contract has no founds");

        _;

    }

    //// @notice it checks the user has the sufficient balance
    //// @param _amount the amount to check
    modifier checkShares( uint _amount) {

        require( _amount > 0, "Error: Invalid Amount, value = 0");
        
        require( balanceOf( msg.sender ) >= _amount, "Error: Insufficient LP balance");

        _;

    }

    /**************************************************************/
    /**************************** UTILS ***************************/

    //// @notice decimals representation
    function decimals() public pure override returns( uint8 ) {

        return 6;
        
    }

    //// @notice this return the minimum between the passed numbers
    function _min( uint x, uint y ) private pure returns( uint ) {

        return x <= y ? x : y;

    }

    //// @notice it return the maximum between the past numbers
    function _max( uint x, uint y ) private pure returns( uint ) {

        return x >= y ? x : y;

    }

    //// @notice it updates the current reserves
    //// @param _amountToken1 the new total reserves of token 1
    //// @param _amountToken2 the new total reserves of token 2
    function _updateBalances( uint _amountToken1, uint _amountToken2) private {

        totalToken1 = _amountToken1;

        totalToken2 = _amountToken2;

        // k = _amountToken1 * _amountToken2;

    }

    //// @notice this verify if two numbers are equal
    //// @dev if they are not equal, take the minimum + 1 to check if it is equal to the largest
    //// this to handle possible precision errors
    //// @param x amount 1
    //// @param y amount 2
    function _isEqual( uint x, uint y ) private pure returns( bool ) {

        if ( x == y) return true;

        else return _min( x, y ) + 1 == _max( x, y );

    }

    //// @notice it multiply the amount by the respective ERC20 decimal representation
    //// @param _amount the amount to multiply
    //// @param _decimals the decimals representation to multiply 
    function _handleDecimals( uint _amount, uint8 _decimals ) private pure returns( uint ) {

        if ( _decimals > 6 ) return _amount * 10 ** ( _decimals - 6 );

        else return _amount;
        
    }

    //// @notice this returns the maximum tradable amount of the reserves
    //// @param _totalTokenOut the total reserves of the output token
    function maxTrade( uint _totalTokenOut ) public view returns ( uint maxTradeAmount ) {

        maxTradeAmount = ( _totalTokenOut * maxTradePercentage ) / 10000;

    }

    //// @notice returns how much shares ( LP tokens ) send to user
    //// @param _token1 amount of token 1
    //// @param _token2 amount of token 2
    function estimateShares( uint _token1, uint _token2 ) public view returns ( uint _shares ) {

        if( totalSupply() == 0 ) {

            require( _token1 == _token2, "Error: Genesis Amounts must be the same" );

            _shares = _token1;

        } else {

            uint share1 = (_token1 * totalSupply()) / totalToken1;

            uint share2 = (_token2 * totalSupply()) / totalToken2;

            require( _isEqual( share1, share2) , "Error: equivalent value not provided");
            
            _shares = _min( share1, share2 );
            
        }

        require( _shares > 0, "Error: shares with zero value" );
        
    }

    //// @notice returns the number of token 1 and token 2 that is sent depending on the number of LP tokens passed as parameters (actions)
    //// @param _shares amount of LP tokens
    function estimateWithdrawAmounts( uint _shares ) public view isActive returns( uint amount1, uint amount2 ) {

        require ( _shares <= totalSupply(), "Error: insufficient pool balance");

        amount1 = ( totalToken1 * _shares ) / totalSupply();

        amount2 = ( totalToken2 * _shares ) / totalSupply();

    }

    //// @notice returns the amount of the output token returned in an operation
    //// @param _amountIn amount of token input 
    //// @param _totalTokenIn total reserves of token input 
    //// @param _totalTokenOut amount of token output
    function estimateSwap( uint _amountIn, uint _totalTokenIn, uint _totalTokenOut ) public view returns ( uint amountIn, uint amountOut, uint creatorFee ) {

        require( _amountIn > 0 && _totalTokenIn > 0 && _totalTokenOut > 0, "Swap Error: Input amount with 0 value not valid");

        uint amountInWithFee = ( _amountIn * ( 10000 - ( tradeFee + protocolFee ) ) ) / 10000;

        creatorFee = ( _amountIn * protocolFee ) / 10000;

        amountIn = _amountIn - creatorFee ;

        amountOut = ( _totalTokenOut * amountInWithFee ) / ( _totalTokenIn + amountInWithFee );

        require( amountOut <= maxTrade( _totalTokenOut ), "Swap Error: output value is greater than the limit");

    }

    /**************************************************************/
    /*********************** VIEW FUNCTIONS ***********************/

    //// @notice it returns the current pool info
    function getPoolInfo() public view returns( PoolInfo memory _poolInfo ) {

        _poolInfo = PoolInfo({
            token1: token1,
            token2: token2,
            totalToken1: totalToken1,
            totalToken2: totalToken2,
            tradeFee: tradeFee,
            protocolFee: protocolFee,
            maxTradePercentage: maxTradePercentage
        });
    
    }

    /**************************************************************/
    /*********************** SET FUNCTIONS ************************/

    //// @dev to calculate how much pass to the new percetages
    //// percentages precition is on 2 decimal representaion so multiply the
    //// percentage by 100, EJ: 0,3 % == 30

    //// @notice set a new protocol fee
    //// @param _newProtocolFee new trade fee percentage
    function setProtocolFee( uint16 _newProtocolFee ) public onlyOwner returns ( bool ) {

        protocolFee = _newProtocolFee;

        emit NewProtocolFee( owner(), _newProtocolFee);

        return true;

    }

    //// @notice set a new trade fee
    //// @param _newTradeFee new trade fee percentage
    function setTradeFee( uint16 _newTradeFee ) public onlyOwner returns ( bool ) {

        tradeFee = _newTradeFee;

        emit NewTradeFee( owner(), _newTradeFee);

        return true;

    }

    //// @notice set a new maximum tradable percentage
    //// @param _newTradeFee new trade fee percentage
    function setMaxTradePercentage( uint16 _newTradePercentage ) public onlyOwner returns ( bool ) {

        maxTradePercentage = _newTradePercentage;

        emit NewMaxTradePercentage( owner(), _newTradePercentage);

        return true;

    }

    /**************************************************************/
    /*********************** POOL FUNCTIONS ***********************/

    //// @notice add new liquidity
    //// @param _token1 amount of token 1
    //// @param _token2 amount of token 2
    function addLiquidity( uint _token1, uint _token2 ) public returns ( bool )  {

        uint _shares = estimateShares( _token1, _token2 );

        require(token1.transferFrom( msg.sender, address( this ), _handleDecimals(_token1, token1.decimals()) ));

        require(token2.transferFrom( msg.sender, address( this ), _handleDecimals(_token2, token2.decimals()) ));

        _mint( msg.sender, _shares );

        _updateBalances( totalToken1 + _token1, totalToken2 + _token2 );

        emit NewLiquidity( msg.sender, _token1, _token2 );

        return true;

    }

    //// @notice remove liquidity
    //// @param _shares amount of LP tokens 
    function removeLiquidity( uint _shares ) public isActive checkShares( _shares ) returns( bool ){

        ( uint amount1, uint amount2 ) = estimateWithdrawAmounts( _shares );

        require( amount1 > 0 && amount2 > 0, "Withdraw Error: amounts with zero value");

        require( token1.transfer( msg.sender, _handleDecimals( amount1, token1.decimals() )  ) );

        require( token2.transfer( msg.sender, _handleDecimals( amount2, token2.decimals() ) ) );

        _burn( msg.sender, _shares);

        _updateBalances( totalToken1 - amount1, totalToken2 - amount2 );

        emit LiquidityWithdraw( msg.sender, amount1, amount2 );

        return true;

    }

    //// @notice trade tokens
    //// @param _tokenIn the address of the input token 
    //// @param _amountIn the amount of input token
    function swap( address _tokenIn, uint _amountIn ) public isActive returns( bool ) {

        require( _tokenIn == address(token1) || _tokenIn == address(token2), "Trade Error: invalid token");

        bool isToken1 = _tokenIn == address(token1);

        ( IERC20Metadata tokenIn, IERC20Metadata tokeOut, uint _totalTokenIn, uint _totalTokenOut ) = isToken1 
            ? ( token1, token2, totalToken1, totalToken2 )
            : ( token2, token1, totalToken2, totalToken1 );

        ( uint amountIn, uint amountOut, uint creatorFee ) = estimateSwap( _amountIn, _totalTokenIn, _totalTokenOut );
        
        require( tokenIn.transferFrom( msg.sender, owner(), _handleDecimals( creatorFee, tokenIn.decimals() ) ));

        require( tokenIn.transferFrom( msg.sender, address( this ), _handleDecimals( amountIn, tokenIn.decimals() ) ));

        require( tokeOut.transfer( msg.sender, _handleDecimals( amountOut, tokeOut.decimals() ) ));

        if ( isToken1 ) _updateBalances( totalToken1 + amountIn, totalToken2 - amountOut );

        else _updateBalances( totalToken1 - amountOut, totalToken2 + amountIn );

        emit Swap( msg.sender, _amountIn ,amountOut);

        return true;

    }

}
