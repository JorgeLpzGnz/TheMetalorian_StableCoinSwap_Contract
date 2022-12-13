// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDCoin is ERC20 {

    constructor() ERC20('USDCoin', "USDCoin") {

        _mint(msg.sender, 1000000000 ether );

    }

    function decimals() public pure override returns( uint8 ) {

        return 6;
        
    }

}