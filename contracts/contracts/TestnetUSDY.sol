// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TestnetUSDY is ERC20, Ownable {
    uint256 public constant FAUCET_MINT_LIMIT = 10_000 * 10 ** 18;

    string public constant MIRROR_NOTICE = "Testnet mirror only. No claim on real USDY, treasuries, or issuer redemption.";
    string public constant REFERENCE_ASSET = "Ondo USDY on Mantle";
    string public constant REFERENCE_ASSET_TYPE = "Tokenized note secured by short-term US Treasuries and bank demand deposits";

    bytes32 public assetPassportHash;

    event AssetPassportHashUpdated(bytes32 assetPassportHash);

    error FaucetMintTooLarge(uint256 requested, uint256 limit);

    constructor(address initialOwner, bytes32 initialAssetPassportHash) ERC20("Sentinel Testnet USDY Mirror", "tUSDY") Ownable(initialOwner) {
        assetPassportHash = initialAssetPassportHash;
        _mint(initialOwner, 1_000_000 * 10 ** decimals());
        emit AssetPassportHashUpdated(initialAssetPassportHash);
    }

    function mint(address to, uint256 amount) external {
        if (amount > FAUCET_MINT_LIMIT) revert FaucetMintTooLarge(amount, FAUCET_MINT_LIMIT);

        _mint(to, amount);
    }

    function setAssetPassportHash(bytes32 newAssetPassportHash) external onlyOwner {
        assetPassportHash = newAssetPassportHash;
        emit AssetPassportHashUpdated(newAssetPassportHash);
    }
}
