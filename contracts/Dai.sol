// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Dai is ERC20 {

    constructor() ERC20('Dai Stablecoin', "DAI") {

        _mint(msg.sender, 100000000000 ether );

    }

    function mint( uint _amount ) public returns ( bool ) {

        _mint( msg.sender, _amount );

        return true;
        
    }

}