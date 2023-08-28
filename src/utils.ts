export {findNotValidMove, findTopEdgePos, findRightEdgePos}
import { Block} from "./types"


const findNotValidMove = (isTouched: boolean[]) => isTouched.reduce((flag,current) => {
    return !current ? current : flag
})

const findTopEdgePos = (block: Block) => {
    return block.y - block.height
}

const findRightEdgePos = (block: Block) => {
    return block.x + block.width
}

