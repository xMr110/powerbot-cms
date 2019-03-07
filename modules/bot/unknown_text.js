const dialogflow = require('dialogflow')
const uuid = require('uuid')
const logger = require('../logger')
const preMessages = require('./premade_messages')
const knex = require('../knex')
const redis = require('../redis')
const config = require('../../config/config')
const messages = require('../messages')
const userNLP = require('../../../../nlp.js')

async function registerPhrase (message) {
  try {
    if (!config.features.registerUnknownPhrases) return
    await knex('unknown_phrases').insert({
      phrase: message.text
    })
  } catch (e) {
    throw e
  }
}

async function useDialogflow (message, user) {
  try {
    if (!config.dialogflow.enable) return false

    let sessionId = await redis.getAsync(`dialogflow-session-user:${user.id}`)
    if (!sessionId) sessionId = uuid.v4()
    redis.set(`dialogflow-session-user:${user.id}`, sessionId, 'EX', config.dialogflow.sessionTimeout)

    const sessionClient = new dialogflow.SessionsClient()
    const sessionPath = sessionClient.sessionPath(config.dialogflow.projectId, sessionId)

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message.text,
          languageCode: config.dialogflow.language
        }
      }
    }

    const responses = await sessionClient.detectIntent(request)
    return responses[0].queryResult
  } catch (e) {
    logger.error(e)
  }
}

module.exports = async function (message, user) {
  try {
    const patterns = await preMessages.loadRegexMessages()
    let success = false

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex_body, pattern.regex_flags)
      if (regex.test(message.text)) {
        success = true
        await message.reply.raw(await messages.get(pattern.message_id, user))
        break
      }
    }

    if (success) return

    const nlpData = await useDialogflow(message, user)
    const nlpHandled = await userNLP(nlpData, message, user)
    if (nlpHandled) return
    await registerPhrase(message)
    await message.reply.raw(await messages.get('default', user))
  } catch (e) {
    throw e
  }
}
