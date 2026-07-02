(function () {
  const monsterStates = {
    idle: [0, 4, 8, 12],
    move: [1, 5, 9, 13],
    hit: [2, 6, 10, 14],
    death: [3, 7, 11, 15]
  };

  window.KeyPilotAssets = {
    scenes: {
      menuHangar: {
        id: "menuHangar",
        name: "任务选择舱",
        background: "assets/scenes/menu_node_hangar_approved_v03.png",
        quality: "approved"
      },
      preflightChamber: {
        id: "preflightChamber",
        name: "战前预检舱",
        background: "assets/scenes/preflight_chamber_approved_v03.png",
        quality: "approved"
      },
      calibrationChamber: {
        id: "calibrationChamber",
        name: "机械臂校准舱",
        background: "assets/scenes/calibration_chamber_approved_v03.png",
        quality: "approved"
      },
      reportChamber: {
        id: "reportChamber",
        name: "任务报告舱",
        background: "assets/scenes/report_chamber_approved_v03.png",
        quality: "approved"
      }
    },
    characters: {
      k01: {
        preview: "assets/characters/k01/k01_preview_approved_v04.png",
        sheet: "assets/characters/k01/k01_sheet_approved_v04.png",
        quality: "approved",
        alpha: "clean",
        version: "v04",
        frameWidth: 192,
        frameHeight: 192,
        columns: 7,
        rows: 4,
        states: {
          idle: [0, 7, 14, 21],
          baseLock: [1, 8, 15, 22],
          strike: [2, 9, 16, 23],
          return: [3, 10, 17, 24],
          damaged: [4, 11, 18, 25],
          overdrive: [5, 12, 19, 26],
          shutdown: [6, 13, 20, 27]
        }
      }
    },
    monsters: {
      driftZombie: {
        id: "driftZombie",
        name: "漂移僵尸",
        preview: "assets/monsters/drift_zombie_preview_approved_v04.png",
        sheet: "assets/monsters/drift_zombie_sheet_approved_v04.png",
        quality: "approved",
        alpha: "clean",
        version: "v04",
        frameWidth: 192,
        frameHeight: 192,
        columns: 4,
        rows: 4,
        states: monsterStates
      },
      ironWalker: {
        id: "ironWalker",
        name: "铁皮行尸",
        preview: "assets/monsters/iron_walker_preview_approved_v04.png",
        sheet: "assets/monsters/iron_walker_sheet_approved_v04.png",
        quality: "approved",
        alpha: "clean",
        version: "v04",
        frameWidth: 192,
        frameHeight: 192,
        columns: 4,
        rows: 4,
        states: monsterStates
      },
      splitPhantom: {
        id: "splitPhantom",
        name: "分裂残影",
        preview: "assets/monsters/split_phantom_preview_approved_v04.png",
        sheet: "assets/monsters/split_phantom_sheet_approved_v04.png",
        quality: "approved",
        alpha: "clean",
        version: "v04",
        frameWidth: 192,
        frameHeight: 192,
        columns: 4,
        rows: 4,
        states: monsterStates
      },
      rushCrawler: {
        id: "rushCrawler",
        name: "突进感染体",
        preview: "assets/monsters/rush_crawler_preview_approved_v04.png",
        sheet: "assets/monsters/rush_crawler_sheet_approved_v04.png",
        quality: "approved",
        alpha: "clean",
        version: "v04",
        frameWidth: 192,
        frameHeight: 192,
        columns: 4,
        rows: 4,
        states: monsterStates
      },
      oldCoordinateCore: {
        id: "oldCoordinateCore",
        name: "旧坐标核心",
        preview: "assets/monsters/old_coordinate_core_preview_approved_v04.png",
        sheet: "assets/monsters/old_coordinate_core_sheet_approved_v04.png",
        quality: "approved",
        alpha: "clean",
        version: "v04",
        frameWidth: 224,
        frameHeight: 224,
        columns: 5,
        rows: 4,
        states: {
          idle: [0, 5, 10, 15],
          crack1: [1, 6, 11, 16],
          crack2: [2, 7, 12, 17],
          hit: [3, 8, 13, 18],
          death: [4, 9, 14, 19]
        }
      }
    },
    rooms: {
      gate: {
        id: "gate",
        name: "闸门入口",
        background: "assets/rooms/gate/room_gate_approved_v02.png",
        quality: "approved"
      },
      pipe: {
        id: "pipe",
        name: "腐蚀管道",
        background: "assets/rooms/pipe/room_pipe_approved_v02.png",
        quality: "approved"
      },
      nest: {
        id: "nest",
        name: "侧墙巢穴",
        background: "assets/rooms/nest/room_nest_approved_v02.png",
        quality: "approved"
      },
      blackout: {
        id: "blackout",
        name: "闪断隧道",
        background: "assets/rooms/blackout/room_blackout_approved_v02.png",
        quality: "approved"
      },
      core: {
        id: "core",
        name: "旧坐标核心",
        background: "assets/rooms/core/room_core_approved_v02.png",
        quality: "approved"
      }
    },
    cruise: {
      room: {
        id: "cruiseDefense",
        name: "巡航防线舱",
        background: "assets/rooms/cruise/room_cruise_defense_approved_v07.png",
        quality: "approved",
        version: "v07"
      },
      threats: {
        sheet: "assets/monsters/cruise/cruise_threats_sheet_approved_v07.png",
        quality: "approved",
        alpha: "clean",
        version: "v07",
        taxonomy: {
          turret: "device",
          swarm: "creature",
          projectile: "projectile"
        },
        roles: {
          turret: "fixedSpawner",
          swarm: "multiUnitCreature",
          projectile: "ballisticThreat"
        },
        motionVersion: "ballistic-v09",
        mobileDisplay: {
          turret: "projectile",
          swarm: "creature",
          projectile: "projectile"
        },
        frameWidth: 362,
        frameHeight: 362,
        columns: 4,
        rows: 3,
        states: {
          turret: [0, 1, 2, 3],
          swarm: [4, 5, 6, 7],
          projectile: [8, 9, 10, 11]
        }
      }
    },
    vfx: {
      hitSpark: "assets/vfx/vfx_hit_spark.svg",
      combat: {
        sheet: "assets/vfx/vfx_combat_sheet_approved_v02.png",
        quality: "approved",
        frameWidth: 128,
        frameHeight: 128,
        states: {
          hitSpark: [0, 1, 6, 7],
          shieldCrack: [6, 7],
          pollution: [2, 8, 14],
          dissolve: [3, 9, 15]
        }
      }
    },
    ui: {
      targetHud: "assets/ui/target_hud_approved_v02.png",
      quality: "approved"
    },
    audio: {
      version: "v07",
      mixProfiles: ["soft", "standard", "strong"],
      bgm: {
        menu: { src: "assets/audio/bgm/menu_loop_v06.wav", quality: "approved", loop: true },
        preflight: { src: "assets/audio/bgm/preflight_loop_v06.wav", quality: "approved", loop: true },
        calibration: { src: "assets/audio/bgm/calibration_loop_v06.wav", quality: "approved", loop: true },
        combat: { src: "assets/audio/bgm/combat_loop_v06.wav", quality: "approved", loop: true },
        cruise: { src: "assets/audio/bgm/cruise_loop_v07.wav", quality: "approved", loop: true },
        report: { src: "assets/audio/bgm/report_loop_v06.wav", quality: "approved", loop: true }
      },
      sfx: {
        doorSoft: { src: "assets/audio/door_soft.wav", quality: "approved" },
        baseLock: { src: "assets/audio/base_lock.wav", quality: "approved" },
        armStrike: { src: "assets/audio/arm_strike.wav", quality: "approved" },
        armReturn: { src: "assets/audio/arm_return.wav", quality: "approved" },
        monsterHit: { src: "assets/audio/monster_hit.wav", quality: "approved" },
        monsterClear: { src: "assets/audio/monster_clear.wav", quality: "approved" },
        wrongKey: { src: "assets/audio/wrong_key.wav", quality: "approved" },
        driftError: { src: "assets/audio/drift_error.wav", quality: "approved" },
        lowHealth: { src: "assets/audio/low_health.wav", quality: "approved" },
        reportOpen: { src: "assets/audio/report_open.wav", quality: "approved" },
        projectileSpawn: { src: "assets/audio/projectile_spawn.wav", quality: "approved" },
        projectileClose: { src: "assets/audio/projectile_close.wav", quality: "approved" },
        shieldBlock: { src: "assets/audio/shield_block.wav", quality: "approved" },
        counterFire: { src: "assets/audio/counter_fire.wav", quality: "approved" },
        timeoutHit: { src: "assets/audio/timeout_hit.wav", quality: "approved" },
        waveClear: { src: "assets/audio/wave_clear.wav", quality: "approved" }
      }
    }
  };
})();
