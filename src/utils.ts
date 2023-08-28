export {findTouched}

const findTouched = (isTouched: boolean[]) => isTouched.reduce((flag,current) => {
    return !current ? current : flag
  })