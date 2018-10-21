const Incredbot = require('incredbot')

const BotText = require('../models/BotText.js')
const User = require('./models/User.js')

const texts = new BotText()
const incredbot = require('../incredbot.js')

const unknownPostback = require('./unknown_postback')

module.exports = async function(message, user) {
    const payload = message.payload

    switch (payload) {
        case 'CONTACT':
            {
                let qrs = [
                    new incredbot.Helpers.QuickReply('text', 'Tak 💬', 'CONTACT_CONFIRM'),
                    new incredbot.Helpers.QuickReply('text', 'Anuluj ❌', 'CONTACT_CANCEL')
                ]

                await message.reply.quick_replies(await texts.get('moderator_chat', user.locale), qrs)
            }
            break

        case 'CONTACT_CONFIRM':
            {
                let u = new User(user.messenger_id)
                await u.enableModeratorChat()
                await message.reply.text(await texts.get('moderator_chat_started', user.locale))
            }
            break

        case 'CONTACT_CANCEL':
            {
                await message.reply.text(await texts.get('moderator_chat_canceled', user.locale))
            }
            break

        case 'CLEAR_USER_DATA':
            {
                let qrs = [
                    new incredbot.Helpers.QuickReply('text', 'Wymaż moje dane ❌', 'REMOVE_USER_DATA'),
                    new incredbot.Helpers.QuickReply('text', 'Zostań z nami ❤️', 'CLEAR_USER_DATA_CANCEL')
                ]
                await message.reply.quick_replies(await texts.get('user_data_remove', user.locale), qrs)
            }
            break

        case 'REMOVE_USER_DATA':
            {
                let u = new User(user.messenger_id)
                await u.removeFromDatabase()
                await message.reply.text(await texts.get('user_data_removed', user.locale))
            }
            break

        case 'CLEAR_USER_DATA_CANCEL':
            {
                await message.reply.text(await texts.get('user_data_remove_canceled', user.locale))
            }
            break;

        default:
            {
                // await unknownPostback(message, payload)
            }
            break

    }
}
