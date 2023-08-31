export {reduceUtil, findTopEdgePos, findRightEdgePos}
import {Block, CBlock} from "./types"


const reduceUtil = (isTouched: boolean[], typeTrue: boolean) => isTouched.reduce((flag,current) => {
    if(typeTrue){
        return current ? current : flag
    }
    return !current ? current : flag
})

const findTopEdgePos = (block: Block) => {
    return block.y - CBlock.HEIGHT
}

const findRightEdgePos = (block: Block) => {
    return block.x + CBlock.WIDTH
}


