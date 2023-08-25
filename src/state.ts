export{ initialState, createState, createBlock }
import { Block,State, KArgumentState, KArgumentBlock, StateProperty, BlockProperty } from './types'

const initialState: State = {
    gameEnd: false,
    score: 0,
    blocks: [],
    blockCount: 0
  } as const;

const createState = <T extends StateProperty> (s:State, k: KArgumentState<T>): State => {
    // forEach does not work in here, since k can be many types
    // Hence, we need Object.keys to iterate the properties of k
    return Object.keys(k).reduce((newState,key) => {
      return {...newState, [key]: k[key]} 
    },{...s})
  }

  const createBlock = <T extends BlockProperty> (block: Block, k: KArgumentBlock<T>): Block =>{
    return Object.keys(k).reduce((newBlock,key) => {
      return {...newBlock, [key]: k[key]} 
    },{...block})
  }