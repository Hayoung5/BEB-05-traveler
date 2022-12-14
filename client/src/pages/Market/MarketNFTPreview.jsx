import { Avatar, Card, Image } from 'antd';
import Meta from 'antd/lib/card/Meta';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Axios from 'axios';

function MarketNFTPreivew({ collectionData, token }) {
  const [Img, setImg] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [avatar, setAvatar] = useState('');
  useEffect(() => {
    getNFTInfo();
  }, [collectionData]);

  const getNFTInfo = async () => {
    const response = await Axios.get(collectionData.token_uri);

    setImg(`https://ipfs.io/ipfs/${response.data.image.split('//')[1]}`);
    setName(response.data.name);
    setDesc(response.data.description);
    setAvatar(`https://joeschmoe.io/api/v1/random`);
  };

  return (
    <Link
      to={`/market/${collectionData.token_id}`}
      state={{ collectionData: collectionData, token: token }}
    >
      <PreviewImage>
        <Card
          key={collectionData.name}
          hoverable
          cover={<Image alt="collection-card" src={Img} preview={false} style={{ height: 500 }} />}
        >
          <Summary>
            <Avatar src={avatar} />
            <Meta title={name} description={desc} />
          </Summary>
        </Card>
      </PreviewImage>
    </Link>
  );
}

const PreviewImage = styled.div`
  width: 100%;
`;

const Summary = styled.span`
  @import url('https://fonts.googleapis.com/css2?family=Aboreto&family=Noto+Sans+KR:wght@100&display=swap');
  font-family: 'Aboreto', cursive;
  font-family: 'Noto Sans KR', sans-serif;
`;

export default MarketNFTPreivew;
