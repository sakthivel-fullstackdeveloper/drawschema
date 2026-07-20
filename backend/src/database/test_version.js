const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const versionService = require('../services/versionService');
const versionRepository = require('../repositories/versionRepository');
const db = require('../config/db');

async function testVersionHistory() {
  console.log('🚀 Starting Version History automated testing suite...');
  const projectId = 1;
  const userId = 1;

  try {
    // Ensure test user and project exist in the database
    const { User, Project } = require('../models');
    let user = await User.findByPk(userId);
    if (!user) {
      user = await User.create({
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword'
      });
    }
    let project = await Project.findByPk(projectId);
    if (!project) {
      project = await Project.create({
        id: projectId,
        user_id: userId,
        name: 'Test Project'
      });
    }

    // 1. Verify Gzip Compression & Decompression
    console.log('\n--- 1. Testing Compression ---');
    const mockSnapshot = {
      tables: [
        {
          id: 101,
          name: 'users',
          x: 10,
          y: 20,
          width: 200,
          height: 150,
          color: '#ffffff',
          columns: [
            {
              id: 501,
              name: 'id',
              datatype: 'INT',
              nullable: false,
              primaryKey: true,
              foreignKey: false,
              uniqueKey: false,
              autoIncrement: true
            }
          ]
        }
      ],
      relationships: []
    };

    const compressed = versionService.compressSnapshot(mockSnapshot);
    console.log('Compressed snapshot base64 length:', compressed.length);
    const decompressed = versionService.decompressSnapshot(compressed);
    if (JSON.stringify(mockSnapshot) === JSON.stringify(decompressed)) {
      console.log('✅ Gzip compression and decompression matching matches payload!');
    } else {
      throw new Error('Decompressed payload does not match original snapshot');
    }

    // 2. Clear old test versions first (to isolate testing metrics)
    console.log('\n--- 2. Cleaning Test Workspace ---');
    await db.query('DELETE FROM project_versions WHERE project_id = ?', [projectId]);
    console.log('Old project versions deleted.');

    // 3. Test Auto-Save Retention Policies
    console.log('\n--- 3. Testing Autosave Retention Limit (Max 20) ---');
    console.log('Inserting 25 auto-save versions...');
    for (let i = 1; i <= 25; i++) {
      await versionService.createVersion(projectId, userId, {
        name: `Autosave ${i}`,
        description: `Autosave version ${i}`,
        isAutoSave: true
      });
    }

    const totalAutoSaves = await versionRepository.getAutoSaveVersionsCount(projectId);
    console.log('Total auto-saves stored in database:', totalAutoSaves);
    
    // Total should be capped at 20 because of the cleanupOldAutoSaves check
    if (totalAutoSaves === 20) {
      console.log('✅ Retention limit works! Kept exactly the latest 20 auto-saves.');
    } else {
      throw new Error(`Retention check failed: expected 20, got ${totalAutoSaves}`);
    }

    // Check version numbers range (should be 6 to 25)
    const [rows] = await db.query(
      'SELECT version_number FROM project_versions WHERE project_id = ? AND is_auto_save = TRUE ORDER BY version_number ASC',
      [projectId]
    );
    console.log('Retained version numbers:', rows.map(r => r.version_number).join(', '));
    if (rows[0].version_number === 6 && rows[rows.length - 1].version_number === 25) {
      console.log('✅ Oldest auto-saves (v1-v5) were purged successfully.');
    } else {
      throw new Error('Oldest versions were not correctly purged');
    }

    // 4. Test Manual & Pinned Saves
    console.log('\n--- 4. Testing Manual Saves & Pinning ---');
    const manualVer = await versionService.createVersion(projectId, userId, {
      name: 'Manual Checkpoint',
      description: 'Important schema release backup',
      isAutoSave: false
    });
    console.log(`Created manual version v${manualVer.version_number} (ID: ${manualVer.id})`);

    // Pin manual version
    await versionService.updateVersion(projectId, manualVer.id, userId, { isPinned: true });
    console.log('Pinned version v' + manualVer.version_name || manualVer.version_number);

    // Verify pinned flag
    const pinnedVer = await versionService.getVersion(projectId, manualVer.id, userId);
    if (pinnedVer.isPinned === true) {
      console.log('✅ Pin status saved successfully!');
    } else {
      throw new Error('Failed to update pinned state');
    }

    // 5. Test Transaction Rollback
    console.log('\n--- 5. Testing Transaction Rollback on corrupt restore ---');
    // Fetch tables count before failed restore
    const [tablesBefore] = await db.query('SELECT COUNT(*) AS count FROM tables WHERE project_id = ?', [projectId]);
    console.log('Tables count before failed restore:', tablesBefore[0].count);

    // Create a corrupt version snapshot (missing tables key)
    const corruptVer = await versionRepository.create({
      projectId,
      versionNumber: 99,
      versionName: 'Corrupt snapshot',
      description: 'Will fail during restore',
      snapshotJson: versionService.compressSnapshot({ relationships: [] }), // missing tables array!
      isCompressed: true,
      tablesCount: 0,
      relationshipsCount: 0,
      isPinned: false,
      isAutoSave: false,
      createdBy: userId
    });

    try {
      console.log('Attempting restore of corrupted version...');
      await versionService.restoreVersion(projectId, corruptVer.id, userId);
      throw new Error('Restore of corrupt version succeeded when it should have failed');
    } catch (err) {
      console.log('✅ Restore failed as expected with error:', err.message);
      
      // Verify rollback occurred (tables should be untouched)
      const [tablesAfter] = await db.query('SELECT COUNT(*) AS count FROM tables WHERE project_id = ?', [projectId]);
      console.log('Tables count after failed restore:', tablesAfter[0].count);
      if (tablesBefore[0].count === tablesAfter[0].count) {
        console.log('✅ Rollback verified! Project schema remains fully intact.');
      } else {
        throw new Error('Rollback failed! Table structures were deleted or modified');
      }
    }

    console.log('\n======================================');
    console.log('🎉 ALL BACKEND VERSION HISTORY TESTS PASSED!');
    console.log('======================================');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Integration Test Suite Failed:', error);
    process.exit(1);
  }
}

testVersionHistory();
