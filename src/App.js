import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
import {Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import {Program, Provider, web3} from '@project-serum/anchor';

import idl from './idl.json';
import kp from './keypair.json'

const {SystemProgram, Keypair} = web3;

let key;

if(process.env.REACT_APP_key){
  const data = JSON.parse(process.env.REACT_APP_key)
  key = Object.values(data.secretKey)
}else{
  key = Object.values(kp._keypair.secretKey)
}
const arr = key;
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');
const opts = {
  preflightCommitment: "processed"
}
const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom Wallet found!");

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(response.publicKey);
          console.log(response.publicKey.toString());
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object found! Download the Phantom Wallet extension");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    const {solana} = window;

    if(solana){
      const response = await solana.connect();
      console.log(response.publicKey);
      console.log(response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const onInputChange = (event) =>{
    const {value} = event.target;
    setInputValue(value);
  }

  const getProvider = () =>{
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }
  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();
  
    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }
  const sendGif = async () =>{
    if(inputValue.length > 0){
      console.log('Gif link: ', inputValue);
      try{
        const provider = getProvider();
        const program = new Program(idl, programID, provider);
        await program.rpc.addGif(inputValue,{
          accounts:{
            baseAccount: baseAccount.publicKey,
            user: provider.wallet.publicKey
          }
        })
      }catch(error){
        console.log("Failed to connect to solana and add gif.")
      }
      
    }else{
      alert('Empty input. Try again.');
    }
  }
  const renderConnectedContainer = () => {
    if(gifList === null){
      return (
        <div className="connected-container">
        <button className="cta-button submit-gif-button" onClick={createGifAccount}>
          Do One-Time Initialization For GIF Program Account
        </button>
      </div> 
      )
    }else{
      return (
        <div className="connected-container">
      <form
        onSubmit={(event) =>{ 
          event.preventDefault();
          sendGif();
        }}>
          <input 
          type="text" 
          placeholder="Enter gif link!" 
          value={inputValue}
          onChange={onInputChange}/>
          <button 
          type="submit" 
          className="cta-button submit-gif-button"
          >Submit</button>
      </form>
      <div className="gif-grid">
        {gifList.map(gif => (
          <div className="gif-item" key={gif.gifLink}>
            <img src={gif.gifLink} alt={gif.gifLink} />
          </div>
        ))}
      </div>
    </div>
      )
    }
  }
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the base account", account);
      setGifList(account.gifList);
    }catch(error){
      console.log("Error getting gifs", error)
      setGifList(null)
    }
  }
  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        {/* <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div> */}
      </div>
    </div>
  );
};

export default App;
