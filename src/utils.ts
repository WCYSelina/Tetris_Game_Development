export {reduceUtil as findNotValidMove, findTopEdgePos, findRightEdgePos}
import { Block} from "./types"


const reduceUtil = (isTouched: boolean[], typeTrue: boolean) => isTouched.reduce((flag,current) => {
    if(typeTrue){
        return current ? current : flag
    }
    return !current ? current : flag
})

const findTopEdgePos = (block: Block) => {
    return block.y - block.height
}

const findRightEdgePos = (block: Block) => {
    return block.x + block.width
}

