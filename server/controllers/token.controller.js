const abi20 = require("../abi20");
const abi721 = require("../abi721");
const address20 = require("../address20");
const address721 = require("../address721");

const { NFTStorage } = require("nft.storage");
const nftstorage = new NFTStorage({token: process.env.NFT_STORAGE_KEY});

const jwt = require("jsonwebtoken");
const fs = require("fs");

const Web3 = require('web3');
const web3 = new Web3(process.env.RPCURL);
const contract20 = new web3.eth.Contract(abi20, address20);
const contract721 = new web3.eth.Contract(abi721, address721);

const nftmodel = require('../models/nft');
const usermodel = require('../models/user');

module.exports = {
    transfer_20: async (req, res) => {
        // req : user 정보(user_id, nickname, sender_address)는 토큰으로 온다.
        // password는 body
        // recipient(user_id or nickname), amount는 body

        const sender = '토큰을 복호화해서 address'
        let recipientInfo;
        if(req.body.recipient_id){
            recipientInfo = await usermodel.getUserInfoById(req.body.recipient_id);
        }
        if(req.body.recipient_nickname){
            recipientInfo = await usermodel.getUserInfoByNickname(req.body.recipient_nickname)
        }
        if(req.body.recipient_address) {
            recipientInfo = await usermodel.getUserInfoByAddress(req.body.recipient_address)
        }

        const recipientAddress = recipientInfo.address;

        let senderBalance;
        let recipientBalance;
        const data = contract20.methods.transfer(sender, recipientAddress, amount).encodeABI();
        const rawTransaction = {"to": address20, "gas": 100000, "data": data};
        web3.eth.account.signTransaction(rawTransaction, process.env.ADMIN_WALLET_PRIVATE_KEY)
            .then( signedTX => web3.eth.sendSignedTransaction(signedTX.rawTransaction))
            .then( req => {
                senderBalance = contract20.methods.balanceOf(sender).call();
                recipientBalance = contract20.methods.balanceOf(recipientAddress).call();
                return true;
            })
            .catch(err =>{
                console.error(err, "Transaction failure")
            })
        
        const updateSenderInfo = await usermodel.setEthAmountById('토큰을 복호화해서 user_id', senderBalance);
        const updateRecipientInfo = await usermodel.setEthAmountById(recipientInfo.user_id, recipientBalance);

        return res.status(200).send({data: {updateSenderInfo, updateRecipientInfo}, message: "Transaction success"}) 
    },

    transfer_721: async (req, res) => {
        const sender = '토큰을 복호화해서 address'
        let recipientInfo;
        if(req.body.recipient_id){
            recipientInfo = await usermodel.getUserInfoById(req.body.recipient_id);
        }
        if(req.body.recipient_nickname){
            recipientInfo = await usermodel.getUserInfoByNickname(req.body.recipient_nickname)
        }
        if(req.body.recipient_address) {
            recipientInfo = await usermodel.getUserInfoByAddress(req.body.recipient_address)
        }


        const recipientAddress = recipientInfo.address;

        let senderBalance;
        let recipientBalance;
        const data = contract721.methods.transferFrom(sender, recipientAddress, token_id).encodeABI();
        const rawTransaction = {"to": address721, "gas": 100000, "data": data};
        web3.eth.account.signTransaction(rawTransaction, process.env.ADMIN_WALLET_PRIVATE_KEY)
            .then( signedTX => web3.eth.sendSignedTransaction(signedTX.rawTransaction))
            .then( req => {
                senderBalance = contract721.methods.balanceOf(sender).call();
                recipientBalance = contract721.methods.balanceOf(recipientAddress).call();
                return true;
            })
            .catch(err =>{
                console.error(err, "Transaction failure")
            })
        
        const updateSenderInfo = await usermodel.setTokenAmountById('토큰을 복호화해서 user_id', senderBalance);
        const updateRecipientInfo = await usermodel.setTokenAmountById(recipientInfo.user_id, recipientBalance);

        return res.status(200).send({data: {updateSenderInfo, updateRecipientInfo}, message: "Transaction success"}) 

    },

    // image, name, description, access token
    mint: async (req, res) => {
        const accessToken = req.headers.authorization;

        if(!accessToken) {
            return res.status(404).send({data: null, message: 'Invalid access token'})
        } else {
            const token = accessToken.split(' ')[1];
            
            if(!token){
                return res.status(404).send({data: null, message: 'Invalid access token'})
            } else {
                const userInfo = jwt.verify(token, process.env.ACCESS_SECRET);
                console.log(userInfo);
                const imgFile = fs.readFileSync(req.file.path, (err, data) => {
                    if(err){
                        console.log("Don't read file :", err);
                        return res.status(500).send({data:null, message:"Internal server error"})
                    }
                    console.log(data)
                    return data[0];
                })

                const blob = new File(imgFile, {type : req.file.mimetype })

                // image IPFS upload
                const rawMetaData = {
                    name: "test",
                    description: "ddddd",
                    image: blob
                }
                const nftCID = await nftstorage.store(rawMetaData);
                console.log(nftCID)
                const newTokenURI = "https://ipfs.io/ipfs/" + nftCID.url.replace("ipfs://", "");

                // Contract mintNFT 함수 실행하는 트랜잭션 발행
                let senderBalance;
                const data = contract721.methods.mintNFT(userInfo.address, newTokenURI).encodeABI();
                const rawTransaction = {"to": address721, "gas": 100000, "data": data};
                web3.eth.account.signTransaction(rawTransaction, process.env.ADMIN_WALLET_PRIVATE_KEY)
                    .then( signedTx => web3.eth.sendSignedTransaction(signedTx.rawTransaction))
                    .then( req => {
                        senderBalance = contract721.methods.balanceOf(userInfo.address).call();
                        return true;
                    })
                    .catch(err => {
                        console.error(err, "Minting failure")
                    });

                // 몽고DB 의 user정보 업데이트.           
                const updateSenderInfo = await usermodel.setTokenAmountById(userInfo.address, senderBalance);

                return res.status(200).send({data: updateSenderInfo, message: "Minting completed"})
            }
        }
    },

    buynft: async (req, res) => {
        // 판매등록만...트랜잭션 x
        const {token_id, buyer_id, payment} = req.body;
        
        const data = contract721.methods.buyNFT(sender, recipientAddress, token_id, payment).encodeABI();
        const rawTransaction = {"to": address721, "gas": 100000, "data": data};

        web3.eth.account.signTransaction(rawTransaction, process.env.ADMIN_WALLET_PRIVATE_KEY)
            .then( signedTX => web3.eth.sendSignedTransaction(signedTX.rawTransaction))
            .then( req => {
                senderBalance = contract721.methods.balanceOf(sender).call();
                recipientBalance = contract721.methods.balanceOf(recipientAddress).call();
                return true;
            })
            .catch(err =>{
                console.error(err, "Transaction failure")
            })

        const buyResult = nftmodel.buynft(token_id, buyer_id, recipientAddress)
        return res.status(200).send({data : buyResult, message : "NFT를 구매합니다"});
    },

    sellnft: async (req, res) => {
        const {user_id, token_id, price} = req.body;
        const haveNFT = '판매하고자하는 nft를 소유했는지 확인절차'
        const sellResult = nftmodel.sellnft(token_id, price);
        
        return res.status(200).send({data : sellResult, message : "NFT를 판매합니다."});
    },

    findallnft: (req, res) => {
        console.log("모든 NFT 정보를 불러옵니다.")
        return res.status(200).send('모든 NFT 정보를 불러옵니다.')
    }
};