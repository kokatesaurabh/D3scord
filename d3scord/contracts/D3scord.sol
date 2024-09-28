// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract D3scord is ERC721, ReentrancyGuard { 
    uint public totalSupply;
    uint public totalChannels;
    address public owner;

    struct Channel {
        uint id;
        string name;
        uint cost;
    }

    mapping(uint => Channel) public channels;
    mapping(uint => mapping(address => bool)) public hasJoined;

    event ChannelCreated(uint id, string name, uint cost);
    event TokenMinted(address indexed to, uint channelId, uint tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {
        owner = msg.sender;
    }

    function createChannel(string memory _name, uint _cost)
        public
        onlyOwner
    {
        totalChannels++;
        channels[totalChannels] = Channel(totalChannels, _name, _cost);
        emit ChannelCreated(totalChannels, _name, _cost);
    }

    function mint(uint _id) public payable nonReentrant {
        require(_id != 0, "Invalid channel ID");
        require(_id <= totalChannels, "Channel does not exist");
        require(!hasJoined[_id][msg.sender], "Already joined channel");
        require(msg.value >= channels[_id].cost, "Insufficient funds");

        hasJoined[_id][msg.sender] = true;
        totalSupply++;

        _safeMint(msg.sender, totalSupply);
        emit TokenMinted(msg.sender, _id, totalSupply);
    }

    function getChannel(uint _id) public view returns (Channel memory) {
        require(_id > 0 && _id <= totalChannels, "Channel does not exist");
        return channels[_id];
    }

    function withdraw() public onlyOwner nonReentrant {
        uint balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
