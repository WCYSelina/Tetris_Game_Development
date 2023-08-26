export{ initialState, tick as createState, createBlock, create22square, createInitialBlock }
import { Block,State, KArgumentState, KArgumentBlock, StateProperty, BlockProperty, Viewport, Constants, Body} from './types'

const initialState: State = {
    gameEnd: false,
    score: 0,
    blocks: [],
    bigBlockCount: 0,
    blockCount: 0
  } as const;

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @param k 
 * @returns Updated state
 */
const tick = <T extends StateProperty> (s:State, k: KArgumentState<T>): State => {
  // forEach does not work in here, since k can be many types
  // Hence, we need Object.keys to iterate the properties of k
  return Object.keys(k).reduce((newState,key) => {
    return {...newState, [key]: k[key]} 
  },{...s})
}

const createBlock = <T extends BlockProperty> (block: Block, k: KArgumentBlock<T> | null = null): Block =>{
  if(k){
    return Object.keys(k).reduce((newBlock,key) => {
      return {...newBlock, [key]: k[key]} 
    },{...block})
  }
  else{
    return {...block}
  }
}

const createInitialBlock = (s:State, colour: string, x: number, y: number): Block => {
  const block: Block = { 
    id: `${s.blockCount}`,
    parentId: `${s.bigBlockCount}`,
    x: x,
    y: y,
    width: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
    height: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
    placed: false,
    style: `fill: ${colour}`,
    class: "block"
  }
  return block
}

const create22square = (s:State): Body[] => {
  const block1 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2,0) 
  const block2 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2 - block1.width,0)
  const block3 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2 - block1.width,block2.y+block2.height)
  const block4 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2,block2.y+block2.height)
  
  return [block3, block4, block1, block2]
}

