/**
 * Repository Index - Export tất cả repositories
 *
 * Usage:
 * const { UserRepository, MatRungRepository, AdminRepository } = require('./repositories');
 */

const BaseRepository = require('./BaseRepository');
const UserRepository = require('./UserRepository');
const MatRungRepository = require('./MatRungRepository');
const AdminRepository = require('./AdminRepository');

module.exports = {
  BaseRepository,
  UserRepository,
  MatRungRepository,
  AdminRepository
};
