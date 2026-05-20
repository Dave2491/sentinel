// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SentinelAgentIdentity {
    string public name = "Sentinel Agent Identity";
    string public symbol = "SENTINEL-AI";

    address public owner;
    uint256 public totalSupply;

    mapping(uint256 => address) private owners;
    mapping(address => uint256) private balances;
    mapping(uint256 => string) private tokenUris;
    mapping(uint256 => address) private tokenApprovals;
    mapping(address => mapping(address => bool)) private operatorApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed tokenOwner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed tokenOwner, address indexed operator, bool approved);
    event AgentIdentityMinted(uint256 indexed tokenId, address indexed owner, string tokenUri);
    event AgentMetadataUpdated(uint256 indexed tokenId, string tokenUri);

    error NotOwner();
    error TokenDoesNotExist();
    error NotApprovedOrOwner();
    error ZeroAddress();

    constructor(string memory initialTokenUri) {
        owner = msg.sender;
        _mint(msg.sender, initialTokenUri);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = owners[tokenId];
        if (tokenOwner == address(0)) revert TokenDoesNotExist();
        return tokenOwner;
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return balances[account];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (owners[tokenId] == address(0)) revert TokenDoesNotExist();
        return tokenUris[tokenId];
    }

    function approve(address to, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (msg.sender != tokenOwner && !operatorApprovals[tokenOwner][msg.sender]) {
            revert NotApprovedOrOwner();
        }

        tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        if (owners[tokenId] == address(0)) revert TokenDoesNotExist();
        return tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address tokenOwner, address operator) external view returns (bool) {
        return operatorApprovals[tokenOwner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) revert NotApprovedOrOwner();
        if (ownerOf(tokenId) != from) revert NotApprovedOrOwner();
        if (to == address(0)) revert ZeroAddress();

        delete tokenApprovals[tokenId];

        balances[from] -= 1;
        balances[to] += 1;
        owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function updateAgentMetadata(uint256 tokenId, string memory newTokenUri) external onlyOwner {
        if (owners[tokenId] == address(0)) revert TokenDoesNotExist();
        tokenUris[tokenId] = newTokenUri;
        emit AgentMetadataUpdated(tokenId, newTokenUri);
    }

    function _mint(address to, string memory initialTokenUri) internal {
        if (to == address(0)) revert ZeroAddress();

        uint256 tokenId = totalSupply + 1;
        totalSupply = tokenId;

        owners[tokenId] = to;
        balances[to] = 1;
        tokenUris[tokenId] = initialTokenUri;

        emit Transfer(address(0), to, tokenId);
        emit AgentIdentityMinted(tokenId, to, initialTokenUri);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);

        return spender == tokenOwner
            || tokenApprovals[tokenId] == spender
            || operatorApprovals[tokenOwner][spender];
    }
}