// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ERC20Interface {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    // function approve(address spender, uint256 amount) external returns (bool);
    // function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address spender, address recipient, uint256 amount) external returns (bool);
    
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Transfer(address indexed spender, address indexed from, address indexed to, uint256 amount);
    // event Approval(address indexed owner, address indexed spender, uint256 oldAmount, uint256 amount);
}

contract Traveler is ERC20Interface, Ownable {
    mapping (address => uint256) private _balances;
    // mapping (address => mapping (address => uint256)) public _allowances;

    uint256 public _totalSupply;
    string public _name;
    string public _symbol;
    uint8 public _decimals;
    
    constructor(string memory getName, string memory getSymbol) {
        _name = getName;
        _symbol = getSymbol;
        _decimals = 18;
        _totalSupply = 100000000e18;
        _balances[msg.sender] = _totalSupply;
    }
    
    function name() public view returns (string memory) {
        return _name;
    }
    
    function symbol() public view returns (string memory) {
        return _symbol;
    }
    
    function decimals() public view returns (uint8) {
        return _decimals;
    }
    // ERC20 총 발행량 확인
    function totalSupply() external view virtual override returns (uint256) {
        return _totalSupply;
    }
    // Owner의 토큰 보유량 확인
    function balanceOf(address account) external view virtual override returns (uint256) {
        return _balances[account];
    }
    // ERC20 직접전송
    function transfer(address recipient, uint amount) public virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }
 
    function transferFrom(address sender, address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        emit Transfer(msg.sender, sender, recipient, amount);
        // uint256 currentAllowance = _allowances[sender][msg.sender];
        // require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        // _approve(sender, msg.sender, currentAllowance, currentAllowance - amount);
        return true;
    }
    
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        _balances[sender] = senderBalance - amount;
        _balances[recipient] += amount;
    }

    function getBack(address viator, uint256 amount) public onlyOwner returns (bool) {
        address owner = owner();
        uint256 viatorBalances = _balances[viator];
        if( viatorBalances < amount ){
            _transfer(viator, owner, viatorBalances);
            emit Transfer(viator, owner, viatorBalances);
            return true;
        }
        _transfer(viator, owner, amount);
        emit Transfer(viator, owner, amount);
        return true;
    }
}