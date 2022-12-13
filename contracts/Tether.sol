// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Tether is ERC20 {

    constructor() ERC20('Tether', "USDT") {

        _mint(msg.sender, 1000000000 ether );

    }

    function decimals() public pure override returns( uint8 ) {

        return 6;
        
    }

}