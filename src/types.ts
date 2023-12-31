export { Constants, Viewport, CBlock}
export type { ObjectId, Block, Key, Event, State, KArgumentState, KArgumentBlock, StateProperty, BlockProperty, KeyPressValue, Rows, MouseClick, EventType, RandomNumber}
/** Constants */
const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
  PREVIEW_WIDTH: 160,
  PREVIEW_HEIGHT: 80,
} as const;

const Constants = {
  TICK_RATE_MS: 500,//500
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
  DOWN_SPEED: 10,
  DROP_BED_ROCK: 8,
  CLEAR_ROW_SCORE: 100,
  DROP_BLOCK_SCORE: 10,
  LEVEL_UP_SCORE: 1000,
  MAX_LEVEL: 10,
  NUM_BLOCK_TYPES: 7
} as const;

/**
 * ObjectIds help us identify objects and manage objects which timeout
 */
type ObjectId = Readonly<{ id: number, parentId: String}>

interface IBlock extends ObjectId{
  width: number,
  height: number,
  x: number,
  y: number,
  placed: boolean,
  style: String,
  class: String,
  type: String,
}

type Block = Readonly<IBlock>
/** User input */

type Key = "KeyS" | "KeyA" | "KeyD" | "KeyW";

type Event = "keydown" | "keyup" | "keypress";

/** Utility functions */

/** State processing */

type Rows = Readonly<{
  id: number,
  blocksInRow: ReadonlyArray<number>
}>

type State = Readonly<{
  gameEnd: boolean;
  score: number;
  blocks: ReadonlyArray<Block>;
  bigBlockCount: number;
  blockCount: number;
  greyBlockCount: number
  allRows: ReadonlyArray<ReadonlyArray<boolean>>;
  nextShape: ReadonlyArray<Block>| null;
  level: number
  highScore: number
  timeDropBedRock: number
}>;

const CBlock = {
  WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
  HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
} as const;

type StateProperty = keyof State; //it will be a union type of State's properties, in this case, "gameEnd" | "score" | "blocks" | "blockCount"
type StatePropertyValue<T extends StateProperty> = State[T]; //State[T] retrives the type of T within the State type, for example, State["score"] will retrieve the type "number"
type KArgumentState<T extends StateProperty> = {
  // StatePropertyValue<T> defines the type of the value, the string means key is accessible by type string and the value type is StatePropertyValue<T>,
  // for example: StatePropertyValue<"score"> = 10, the "score" is a string type, and 10 is number type
  [key: string]: StatePropertyValue<T> 
}

type BlockProperty = keyof Block
type BlockPropertyValue<T extends BlockProperty> = Block[T]
type KArgumentBlock<T extends BlockProperty> = {
  [key: string]: BlockPropertyValue<T>
}

type KeyPressValue = Readonly<{
  direction: string
}>

type MouseClick = Readonly<{
  clickEvent: string
}>;

type RandomNumber = Readonly<{
  randomValue : number
}>

// to merge different observables
type EventType = KeyPressValue | MouseClick | RandomNumber;