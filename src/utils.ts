export {reduceUtil, findTopEdgePos, findRightEdgePos, RNG}
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

/**
 * A random number generator which provides two pure functions
 * `hash` and `scaleToRange`.  Call `hash` repeatedly to generate the
 * sequence of hashes.
 */
abstract class RNG {
    // LCG using GCC's constants
    private static m = 0x80000000; // 2**31
    private static a = 1103515245;
    private static c = 12345;

    /**
     * Call `hash` repeatedly to generate the sequence of hashes.
     * @param seed 
     * @returns a hash of the seed
     */
    public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;

    /**
 h    * Takes hash value and scales it to the range [-1, 1]
     */
    public static scale = (hash: number) => (2 * hash) / (RNG.m - 1) - 1;

    public static mapRange1To4 = (scaledVal: number) => (scaledVal + 1) * (4 - 1) / 2 + 1;
}

