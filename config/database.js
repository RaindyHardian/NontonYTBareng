const Sequelize = require('sequelize')

module.exports = new Sequelize('nontonyt', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
  });