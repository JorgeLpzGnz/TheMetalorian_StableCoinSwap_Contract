// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BinanceUSD is ERC20 {

    constructor() ERC20('BinanceUSD', "BUSD") {

        _mint(msg.sender, 1000000000 ether );

    }

    function mint( uint _amount ) public returns ( bool ) {

        _mint( msg.sender, _amount );

        return true;
        
    }

}