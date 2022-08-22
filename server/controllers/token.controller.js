const abi20 = require("../abi20");
const abi721 = require("../abi721");
const address20 = require("../address20");
const address721 = require("../address721");

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

    transfer_721: (req, res) => {
        // transferfrom 함수로 보내주면 될거같은데,,
        // 요청으로 보유자 주소, 받는 사람 주소, tokenuri 받아서
        // transferfrom 함수로 보내고

        console.log("721토큰을 전송합니다.")

    },

    mint: (req, res) => {
        const { token_uri } = req.body;
        // mint -> 사용자들이 올린 사진 등을 다른 description 등과 함께 nft화
        // 받을 사람 주소와 
        console.log("NFT를 발행합니다.")
    },

    buynft: (req, res) => {
        // 판매등록만...트랜잭션 x
        const {token_id, buyer_id, buyer_address} = req.body;
        const buyResult = nftmodel.buynft(token_id, buyer_id, buyer_address)
        return res.status(200).send({data : buyResult, message : "NFT를 구매합니다"});
    },

    sellnft: (req, res) => {
        const {token_id, price} = req.body;
        const sellResult = nftmodel.sellnft(token_id, price);
        return res.status(200).send({data : sellResult, message : "NFT를 판매합니다."});
    },

    findallnft: (req, res) => {
        console.log("모든 NFT 정보를 불러옵니다.")
        return res.status(200).send('모든 NFT 정보를 불러옵니다.')
    }
};