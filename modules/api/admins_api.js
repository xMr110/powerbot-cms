const argon2 = require('argon2')
const knex = require('../knex.js')
const validator = require('../validators')
const logger = require('../logger.js')

async function list(req, res) {
  try {
    let admins = await knex('admins').select('id', 'name', 'login', 'owner', 'email', 'chat_requests_notifications', 'weekly_email_reports', 'monthly_email_reports').orderBy('id', 'asc')
    res.json(admins)
  } catch (e) {
    logger.error(e)
    res.sendStatus(500)
  }
}

async function create(req, res) {
  try {
    let body = req.body
    if (!validator.admin_account(body).valid) return res.sendStatus(400)
    if (body.password !== body.password_repeat) return res.sendStatus(400)
    delete body.password_repeat

    body.password = await argon2.hash(body.password)
    let [created] = await knex('admins').insert(body).returning('*')
    let admin_id = created.id
    delete body.password

    body = created
    body.id = admin_id

    res.json(body)
  } catch (e) {
    logger.error(e)
    res.sendStatus(500)
  }
}

async function changePassword(req, res) {
  try {
    let body = req.body
    if (!validator.admin_password(body).valid) return res.sendStatus(400)
    if (body.new_password !== body.new_password_repeat) return res.sendStatus(400)

    let admin = await knex('admins').where('id', req.user.id).first()
    if (!await argon2.verify(admin.password, body.password)) return res.sendStatus(401)

    let new_hash = await argon2.hash(body.new_password)
    await knex('admins').update('password', new_hash).where('id', admin.id)
    res.sendStatus(200)
  } catch (e) {
    logger.error(e)
    res.sendStatus(500)
  }
}

async function deleteAdmin(req, res) {
  try {
    let id = req.body.id
    let owner = await knex('admins').where('id', req.user.id).andWhere('owner', true).first()
    let to_delete = await knex('admins').where('id', id).andWhere('owner', false).first()

    if (!owner || !to_delete) return res.sendStatus(401)
    await knex('admins').where('id', id).del()
    res.sendStatus(200)
  } catch (e) {
    logger.error(e)
    res.sendStatus(500)
  }
}

async function notificationsSettings(req, res) {
  try {
    const id = req.body.id
    delete req.body.id
    const [updated] = await knex('admins').update(req.body).where('id', id).returning('*')
    res.json(updated)
  } catch (e) {
    logger.error(e)
    res.sendStatus(500)
  }
}

module.exports = {
  list,
  create,
  changePassword,
  deleteAdmin,
  notificationsSettings
}
