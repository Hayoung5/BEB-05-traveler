const abi20 = require("../abi20");
const abi721 = require("../abi721");
const address20 = require("../address20");
const address721 = require("../address721");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { NFTStorage, File } = require("nft.storage");
const BigNumber = require("big-number");

const Web3 = require("web3");
const web3 = new Web3(process.env.RPCURL);

const contract20 = new web3.eth.Contract(abi20, address20);
const contract721 = new web3.eth.Contract(abi721, address721);

const nftmodel = require("../models/nft");
const usermodel = require("../models/user");

module.exports = {
    transfer_20: async (req, res) => {
        try {
            const accessToken = req.headers.authorization;

            if (!accessToken) {
                return res
                    .status(404)
                    .send({ data: null, message: "Invalid access token" });
            } else {
                const token = accessToken.split(" ")[1];

                if (!token) {
                    return res
                        .status(404)
                        .send({ data: null, message: "Invalid access token" });
                } else {
                    const userInfo = jwt.verify(
                        token,
                        process.env.ACCESS_SECRET
                    );

                    const senderAddress = userInfo.address;

                    let recipientAddress;
                    if (req.body.user_id) {
                        const recipientInfo = await usermodel.getUserInfoById(
                            req.body.user_id
                        );
                        recipientAddress = recipientInfo[0].address;
                    } else if (req.body.nickname) {
                        const recipientInfo =
                            await usermodel.getUserInfoByNickname(
                                req.body.nickname
                            );
                        recipientAddress = recipientInfo[0].address;
                    } else {
                        recipientAddress = req.body.recipient;
                    }
                    console.log("?????????: ", recipientAddress);

                    const amount = req.body.amount;

                    const data = contract20.methods
                        .transferFrom(senderAddress, recipientAddress, amount)
                        .encodeABI();

                    const rawTransaction = {
                        to: address20,
                        gas: 1000000,
                        data: data,
                    };

                    const signedTX = await web3.eth.accounts.signTransaction(
                        rawTransaction,
                        process.env.ADMIN_WALLET_PRIVATE_KEY
                    );

                    const sendingTX = await web3.eth.sendSignedTransaction(
                        signedTX.rawTransaction
                    );
                    console.log("20 Token ?????? ????????????: ", sendingTX);

                    console.log(
                        "??????????????? ????????????, DB ??? 20 Token ????????? ????????? ?????????????????????."
                    );

                    // ?????????????????? ?????? ????????? ????????? ????????????
                    const ethAmount = await contract20.methods
                        .balanceOf(senderAddress)
                        .call();

                    const updateEthAmount = await usermodel.setEthAmountById(
                        userInfo.user_id,
                        ethAmount
                    );
                    console.log(
                        "DB ??????????????? 20 Token??? ???: ",
                        updateEthAmount.eth_amount
                    );

                    res.status(200).send({
                        data: sendingTX,
                        message: "Transfer success",
                    });
                }
            }
        } catch (err) {
            console.log(err);
            res.status(400).send({
                data: null,
                message: "Can't execute request",
            });
        }
    },

    transfer_721: async (req, res) => {
        try {
            const accessToken = req.headers.authorization;

            if (!accessToken) {
                return res
                    .status(404)
                    .send({ data: null, message: "Invalid access token" });
            } else {
                const token = accessToken.split(" ")[1];
                console.log("token", token);
                if (!token) {
                    return res
                        .status(404)
                        .send({ data: null, message: "Invalid access token" });
                } else {
                    const userInfo = jwt.verify(
                        token,
                        process.env.ACCESS_SECRET
                    );

                    const senderAddress = userInfo.address;

                    let recipientAddress;
                    let recipientInfo;
                    if (req.body.user_id) {
                        recipientInfo = await usermodel.getUserInfoById(
                            req.body.user_id
                        );
                        recipientAddress = recipientInfo[0].address;
                    } else if (req.body.nickname) {
                        recipientInfo = await usermodel.getUserInfoByNickname(
                            req.body.nickname
                        );
                        recipientAddress = recipientInfo[0].address;
                    } else {
                        recipientInfo = await usermodel.getUserInfoByAddress(
                            req.body.recipient
                        );
                        recipientAddress = req.body.recipient;
                    }

                    const tokenId = req.body.token_id;

                    const nft_owner = await contract721.methods
                        .ownerOf(tokenId)
                        .call();
                    console.log("DB NFT ?????????", senderAddress);
                    console.log("????????? NFT ?????????", nft_owner);
                    console.log("?????????: ", recipientAddress);

                    if (nft_owner !== senderAddress) {
                        return res
                            .status(404)
                            .send({ data: null, message: "Not owner of NFT" });
                    } else {
                        const nft_owner = await contract721.methods.ownerOf(
                            tokenId
                        );

                        const data = contract721.methods
                            .safeTransferFrom(
                                senderAddress,
                                recipientAddress,
                                tokenId
                            )
                            .encodeABI();

                        const rawTransaction = {
                            to: address721,
                            gas: 1000000,
                            data: data,
                        };

                        const signedTX =
                            await web3.eth.accounts.signTransaction(
                                rawTransaction,
                                process.env.ADMIN_WALLET_PRIVATE_KEY
                            );

                        const sendingTX = await web3.eth.sendSignedTransaction(
                            signedTX.rawTransaction
                        );
                        console.log("NFT ?????? ????????????: ", sendingTX);

                        console.log(
                            "??????????????? ????????????, DB ??? NFT ????????? ????????? ?????????????????????."
                        );
                        const updateOwner = await nftmodel.changeOwner(
                            tokenId,
                            recipientInfo[0].user_id,
                            recipientInfo[0].address
                        );

                        res.status(200).send({
                            data: updateOwner,
                            message: "Transfer success",
                        });
                    }
                }
            }
        } catch (err) {
            console.error(err);
            res.status(400).send({
                data: null,
                message: "Can't execute request",
            });
        }
    },

    mint: async (req, res) => {
        try {
            const accessToken = req.headers.authorization;
            if (!accessToken) {
                return res
                    .status(404)
                    .send({ data: null, message: "Invalid access token" });
            } else {
                const token = accessToken.split(" ")[1];
                if (!token) {
                    return res
                        .status(404)
                        .send({ data: null, message: "Invalid access token" });
                } else {
                    const userInfo = jwt.verify(
                        token,
                        process.env.ACCESS_SECRET
                    );

                    const client = new NFTStorage({
                        token: process.env.NFT_STORAGE_KEY,
                    });

                    const imageFile = new File(
                        [await fs.promises.readFile(req.file.path)],
                        req.file.originalname,
                        {
                            type: req.file.mimetype,
                        }
                    );

                    const nftCID = await client.store({
                        name: req.body.img[0],
                        description: req.body.img[1],
                        image: imageFile,
                    });

                    console.log(nftCID);

                    console.log("nft url: ", nftCID.url);

                    const newTokenURI =
                        "https://ipfs.io/ipfs/" +
                        nftCID.url.replace("ipfs://", "");

                    const data = contract721.methods
                        .mintNFT(userInfo.address, newTokenURI)
                        .encodeABI();

                    const rawTransaction = {
                        to: address721,
                        gas: 1000000,
                        data: data,
                    };

                    const signedTX = await web3.eth.accounts.signTransaction(
                        rawTransaction,
                        process.env.ADMIN_WALLET_PRIVATE_KEY
                    );

                    const sendingTX = await web3.eth.sendSignedTransaction(
                        signedTX.rawTransaction
                    );
                    console.log("NFT ?????? ????????????: ", sendingTX);
                    console.log("NFT ????????? ?????????????????????.");

                    senderBalance = await contract721.methods
                        .balanceOf(userInfo.address)
                        .call({ from: process.env.ADMIN_WALLET_ADDRESS });

                    const updateSenderInfo = await usermodel.setTokenAmountById(
                        userInfo.user_id,
                        senderBalance
                    );
                    res.status(200).send({
                        data: updateSenderInfo,
                        message: "Your NFT is created",
                    });
                }
            }
        } catch (err) {
            console.error(err);
            res.status(400).send({
                data: null,
                message: "Can't execute request",
            });
        }
    },

    buynft: async (req, res) => {
        try {
            const accessToken = req.headers.authorization;
            if (!accessToken) {
                return res
                    .status(404)
                    .send({ data: null, message: "Invalid access token" });
            } else {
                const token = accessToken.split(" ")[1];
                console.log(token);

                if (!token) {
                    return res
                        .status(404)
                        .send({ data: null, message: "Invalid access token" });
                } else {
                    const userInfo = jwt.verify(
                        token,
                        process.env.ACCESS_SECRET
                    );

                    const recipientAddress = userInfo.address;

                    let senderInfo = await usermodel.getUserInfoById(
                        req.body.user_id
                    );

                    const senderAddress = senderInfo[0].address;
                    const tokenId = req.body.token_id;
                    const price = req.body.price;

                    const nft_owner = await contract721.methods
                        .ownerOf(tokenId)
                        .call();

                    console.log("DB NFT ?????????", senderAddress);
                    console.log("????????? NFT ?????????", nft_owner);
                    console.log("?????????: ", recipientAddress);

                    if (nft_owner !== senderAddress) {
                        return res.status(404).send({
                            data: null,
                            message: "Seller isn't owner",
                        });
                    } else {
                        const data = contract721.methods
                            .buyNFT(
                                senderAddress,
                                recipientAddress,
                                tokenId,
                                BigNumber(price)
                            )
                            .encodeABI();

                        const rawTransaction = {
                            to: address721,
                            gas: 1000000,
                            data: data,
                        };

                        const signedTX =
                            await web3.eth.accounts.signTransaction(
                                rawTransaction,
                                process.env.ADMIN_WALLET_PRIVATE_KEY
                            );

                        const sendingTX = await web3.eth.sendSignedTransaction(
                            signedTX.rawTransaction
                        );
                        console.log("NFT ?????? ????????????: ", sendingTX);

                        console.log(
                            "??????????????? ????????????, DB ??? NFT ????????? ????????? ?????????????????????."
                        );
                        const updateOwner = await nftmodel.changeOwner(
                            tokenId,
                            userInfo.user_id,
                            userInfo.address
                        );

                        res.status(200).send({
                            data: sendingTX,
                            message: "Transaction success",
                        });
                    }
                }
            }
        } catch (err) {
            console.log(err);
            res.status(400).send({
                data: null,
                message: "Can't execute request",
            });
        }
    },

    sellnft: async (req, res) => {
        // ?????? ????????? ?????? ????????? DB??? isSelling, price ?????? ??????
        try {
            const accessToken = req.headers.authorization;
            if (!accessToken) {
                return res
                    .status(404)
                    .send({ data: null, message: "Invalid access token" });
            } else {
                const token = accessToken.split(" ")[1];

                if (!token) {
                    return res
                        .status(404)
                        .send({ data: null, message: "Invalid access token" });
                } else {
                    const userInfo = jwt.verify(
                        token,
                        process.env.ACCESS_SECRET
                    );
                    const userId = userInfo.user_id;

                    const tokenId = req.body.token_id;
                    const nftPrice = req.body.price;
                    const tokenInfo = await nftmodel.getInfoByTokenId(tokenId);

                    if (userId !== tokenInfo[0].user_id) {
                        console.log("here, ?????????????");
                        res.status(404).send({
                            data: null,
                            message: "Not owner of NFT",
                        });
                    } else {
                        const registration = await nftmodel.sellNft(
                            tokenId,
                            nftPrice
                        );

                        res.status(200).send({
                            data: registration,
                            message: "Sales-Registration completed",
                        });
                    }
                }
            }
        } catch (err) {
            console.log(err);
            res.status(400).send({
                data: null,
                message: "Can't execute request",
            });
        }
    },

    // NFT??? ?????? ?????? ??????
    cancelsale: async (req, res) => {
        try {
            const accessToken = req.headers.authorization;
            if (!accessToken) {
                return res
                    .status(404)
                    .send({ data: null, message: "Invalid access token" });
            } else {
                const token = accessToken.split(" ")[1];

                if (!token) {
                    return res
                        .status(404)
                        .send({ data: null, message: "Invalid access token" });
                } else {
                    const userInfo = jwt.verify(
                        token,
                        process.env.ACCESS_SECRET
                    );
                    const userId = userInfo.user_id;

                    const tokenId = req.body.token_id;
                    const tokenInfo = await nftmodel.getInfoByTokenId(tokenId);
                    if (userId !== tokenInfo[0].user_id) {
                        res.status(404).send({
                            data: null,
                            message: "Not owner of NFT",
                        });
                    } else {
                        const cancelResist = await nftmodel.cancelSale(tokenId);
                        res.status(200).send({
                            data: cancelResist,
                            message: "Sales-Registration canceled",
                        });
                    }
                }
            }
        } catch (err) {
            console.log(err);
            res.status(400).send({
                data: null,
                message: "Can't execute request",
            });
        }
    },

    findallnft: async (req, res) => {
        try {
            const allNFTsInfo = await nftmodel.getAllNfts();
            return res.status(200).send({
                data: { allNFTsInfo },
                message: "?????? NFT ????????? ???????????????.",
            });
        } catch (err) {
            console.error(err);
            res.status(400).send({
                data: null,
                message: "Can't execute request",
            });
        }
    },

    market: async (req, res) => {
        try {
            const sellingList = await nftmodel.getInfoBySellingStatus(true);

            return res.status(200).send({
                data: sellingList,
                message: "?????? ????????? NFT ????????? ???????????????.",
            });
        } catch (err) {
            console.log(err);
            res.status(400).send({
                data: null,
                message: "Can't execute request",
            });
        }
    },
};
