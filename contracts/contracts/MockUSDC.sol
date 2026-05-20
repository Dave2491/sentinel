// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    uint256 public constant FAUCET_MINT_LIMIT = 100_000 * 10 ** 6;

    error FaucetMintTooLarge(uint256 requested, uint256 limit);

    constructor(address initialOwner) ERC20("Mock USDC", "mUSDC") {
        _mint(initialOwner, 10_000_000 * 10 ** decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        if (amount > FAUCET_MINT_LIMIT) revert FaucetMintTooLarge(amount, FAUCET_MINT_LIMIT);

        _mint(to, amount);
    }
}
