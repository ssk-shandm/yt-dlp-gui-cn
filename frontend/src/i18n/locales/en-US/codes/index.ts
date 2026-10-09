import type zh from '../../zh-CN/codes'
import core from './core'
import tools from './tools'
import update from './update'

const codes: typeof zh = { ...core, ...tools, update }

export default codes
