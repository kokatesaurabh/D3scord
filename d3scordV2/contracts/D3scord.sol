// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract D3scord is ERC721 {
    uint256 public totalSupply;
    uint256 public totalChannels;
    address public owner;

    struct Channel {
        uint256 id;
        string  name;
        uint256 cost;
        string  description;
        bool    isActive;
    }

    mapping(uint256 => Channel)                        public channels;
    mapping(uint256 => mapping(address => bool))       public hasJoined;

    event ChannelCreated(uint256 indexed id, string name, uint256 cost);
    event MemberJoined(uint256 indexed channelId, address indexed member);
    event Withdrawn(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {
        owner = msg.sender;
    }

    function createChannel(
        string memory _name,
        uint256 _cost,
        string memory _desc
    ) public onlyOwner {
        totalChannels++;
        channels[totalChannels] = Channel(totalChannels, _name, _cost, _desc, true);
        emit ChannelCreated(totalChannels, _name, _cost);
    }

    function mint(uint256 _id) public payable {
        require(_id != 0 && _id <= totalChannels, "Invalid channel");
        require(channels[_id].isActive,            "Channel inactive");
        require(!hasJoined[_id][msg.sender],        "Already joined");
        require(msg.value >= channels[_id].cost,   "Insufficient ETH");

        hasJoined[_id][msg.sender] = true;
        totalSupply++;
        _safeMint(msg.sender, totalSupply);
        emit MemberJoined(_id, msg.sender);
    }

    function getChannel(uint256 _id) public view returns (Channel memory) {
        return channels[_id];
    }

    function withdraw() public onlyOwner {
        uint256 bal = address(this).balance;
        (bool ok, ) = owner.call{value: bal}("");
        require(ok, "Withdraw failed");
        emit Withdrawn(owner, bal);
    }

    function transferOwnership(address _new) public onlyOwner {
        require(_new != address(0));
        owner = _new;
    }
}
