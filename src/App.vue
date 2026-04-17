<template>
  <main class="page-shell">
    <section class="view-switcher" v-if="overview">
      <div class="view-switcher__group">
        <button
          type="button"
          class="view-switcher__button"
          :class="{ 'view-switcher__button--active': currentView === 'manager' }"
          @click="currentView = 'manager'"
        >
          Manager view
        </button>
        <button
          type="button"
          class="view-switcher__button"
          :class="{ 'view-switcher__button--active': currentView === 'student' }"
          @click="currentView = 'student'"
        >
          Student view
        </button>
      </div>
    </section>

    <section class="hero" v-if="currentView === 'manager'">
      <div class="hero__copy">
        <p class="hero__eyebrow">Privaceus Planning Analytics</p>
        <h1>Privaceus</h1>
        <p class="hero__lede">
          Built for facility managers, campus planners, students, and oversight authorities with
          GDPR-aware analytics, ISO-aligned controls, and fast scenario visibility.
        </p>

        <div class="hero__stats" v-if="overview">
          <StatCard
            eyebrow="Occupancy"
            :value="percent(overview.summary.occupancyRate)"
            label="Live aggregated utilization"
          />
          <StatCard
            eyebrow="Comfort"
            :value="`${overview.summary.averageComfort}%`"
            label="Average comfort score"
          />
          <StatCard
            eyebrow="HVAC"
            :value="`${overview.summary.averageHvacLoad}%`"
            label="Mean mechanical load"
          />
        </div>
      </div>

      <aside class="hero__panel control-panel" v-if="overview">
        <p class="panel__eyebrow">3D Controls</p>
        <h3>Change the building view here</h3>
        <label class="control-field">
          <span>Color mode</span>
          <select v-model="colorMode">
            <option value="occupancy">Occupancy</option>
            <option value="energy">Energy use</option>
          </select>
        </label>
        <label class="control-toggle">
          <input v-model="upperFloorVisible" type="checkbox" />
          <span>Show upper floor</span>
        </label>
        <label class="control-toggle">
          <input v-model="explodedView" type="checkbox" />
          <span>Exploded floor spacing</span>
        </label>
        <label class="control-field">
          <span>Room opacity</span>
          <input v-model="roomOpacity" type="range" min="0.35" max="1" step="0.05" />
          <strong>{{ Math.round(roomOpacity * 100) }}%</strong>
        </label>
      </aside>
    </section>

    <section v-if="overview && currentView === 'student'" class="student-layout">
      <article class="panel-card student-intro">
        <p class="panel-card__eyebrow">Occupancy Dashboard</p>
        <h3>Student building view</h3>
        <p class="detail-card__note">
          This view is read-only and shows the live 3D building occupancy with the current number
          of people inside. You can rotate the model and select a room to inspect its occupancy.
        </p>
        <div class="student-controls">
          <label class="control-field">
            <span>Room opacity</span>
            <input v-model="roomOpacity" type="range" min="0.35" max="1" step="0.05" />
            <strong>{{ Math.round(roomOpacity * 100) }}%</strong>
          </label>
        </div>
      </article>

      <section class="dashboard-grid dashboard-grid--student">
        <BuildingScene
          :key="studentSceneKey"
          :floors="overview.floors"
          color-mode="occupancy"
          :exploded="false"
          :upper-floor-visible="true"
          :room-opacity="roomOpacity"
          :interactive="true"
          :auto-rotate="false"
          @select-room="selectedRoomId = $event.id"
        />

        <article class="detail-card">
          <p class="detail-card__eyebrow">Occupancy Dashboard</p>
          <template v-if="selectedRoom">
            <h2>{{ selectedRoom.name }}</h2>
            <p class="detail-card__meta">{{ selectedRoom.floorName }} - {{ selectedRoom.zone }}</p>
            <div class="detail-metrics">
              <div>
                <span>People inside</span>
                <strong>{{ selectedRoom.occupied }}</strong>
              </div>
              <div>
                <span>Capacity</span>
                <strong>{{ selectedRoom.capacity }}</strong>
              </div>
              <div>
                <span>Available seats</span>
                <strong>{{ selectedRoom.available }}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{{ selectedRoom.utilizationLabel }}</strong>
              </div>
            </div>
            <p class="detail-card__note">
              {{ selectedRoom.occupied }} people are currently shown in this room in the 3D view.
            </p>
          </template>
          <template v-else>
            <h2>Select a room in the 3D model</h2>
            <p class="detail-card__note">
              Click any room to see its current occupancy and available seats.
            </p>
          </template>
        </article>
      </section>

      <article class="panel-card panel-card--wide">
        <p class="panel-card__eyebrow">Occupancy Dashboard</p>
        <h3>People in the building</h3>
        <div class="ops-grid student-ops-grid">
          <article class="ops-card">
            <span>Total people now</span>
            <strong>{{ overview.summary.totalOccupied }}</strong>
            <p>Live people count currently visible in the 3D building view.</p>
          </article>
          <article v-for="floor in overview.floors" :key="floor.id" class="ops-card">
            <span>{{ floor.name }}</span>
            <strong>{{ floor.totalOccupied }}</strong>
            <p>{{ floor.totalCapacity - floor.totalOccupied }} seats still available.</p>
          </article>
        </div>
      </article>
    </section>

    <section class="dashboard-grid" v-if="overview && currentView === 'manager'">
      <BuildingScene
        :key="sceneKey"
        :floors="overview.floors"
        :color-mode="colorMode"
        :exploded="explodedView"
        :upper-floor-visible="upperFloorVisible"
        :room-opacity="roomOpacity"
        @select-room="selectedRoomId = $event.id"
      />

      <article class="detail-card">
        <p class="detail-card__eyebrow">Room detail</p>
        <template v-if="selectedRoom">
          <h2>{{ selectedRoom.name }}</h2>
          <p class="detail-card__meta">{{ selectedRoom.floorName }} - {{ selectedRoom.zone }}</p>
          <div class="detail-metrics">
            <div>
              <span>Occupancy</span>
              <strong>{{ selectedRoom.occupied }}/{{ selectedRoom.capacity }}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{{ selectedRoom.utilizationLabel }}</strong>
            </div>
            <div>
              <span>HVAC load</span>
              <strong>{{ selectedRoom.hvacLoad }}%</strong>
            </div>
            <div>
              <span>Privacy mode</span>
              <strong>{{ selectedRoom.privacyMode }}</strong>
            </div>
          </div>
          <p class="detail-card__note">
            Comfort score {{ selectedRoom.comfortScore }} with {{ selectedRoom.available }} seats
            available.
          </p>
          <div class="edit-panel">
            <label class="control-field">
              <span>Change occupancy</span>
              <input
                v-model="draftOccupied"
                type="range"
                min="0"
                :max="selectedRoom.capacity"
                step="1"
              />
              <strong>{{ draftOccupied }} / {{ selectedRoom.capacity }} seats</strong>
            </label>
            <label class="control-field">
              <span>Change HVAC load</span>
              <input
                v-model="draftHvacLoad"
                type="range"
                min="0"
                max="100"
                step="1"
              />
              <strong>{{ draftHvacLoad }}%</strong>
            </label>
            <div class="edit-actions">
              <button class="action-button" type="button" @click.prevent="applyRoomUpdates">
                Update
              </button>
              <span v-if="updateMessage" class="update-message">{{ updateMessage }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <h2>Select a room in the 3D model</h2>
          <p class="detail-card__note">
            The building shows two floors and several rooms, colored by live mock occupancy to
            highlight underused and overcrowded spaces.
          </p>
        </template>
      </article>
    </section>

    <section class="content-grid" v-if="overview && currentView === 'manager'">
      <article class="panel-card">
        <p class="panel-card__eyebrow">Occupancy Dashboard</p>
        <h3>Floor performance</h3>
        <div class="floor-grid floor-grid--stacked">
          <article v-for="floor in overview.floors" :key="floor.id" class="floor-card">
            <span>{{ floor.name }}</span>
            <strong>{{ percent(floor.occupancyRate) }}</strong>
            <p>{{ floor.totalOccupied }} of {{ floor.totalCapacity }} seats occupied</p>
          </article>
        </div>
      </article>

      <article class="panel-card">
        <p class="panel-card__eyebrow">Occupancy Dashboard</p>
        <h3>Busiest rooms</h3>
        <ul class="panel-list">
          <li v-for="item in busiestRooms" :key="item.name">
            <strong>{{ item.name }}</strong>
            <span>{{ item.label }} - {{ item.status }}</span>
          </li>
        </ul>
      </article>

      <article class="panel-card">
        <p class="panel-card__eyebrow">Energy Dashboard</p>
        <h3>HVAC attention points</h3>
        <ul class="panel-list">
          <li v-for="item in energyAlerts" :key="item.room">
            <strong>{{ item.room }}</strong>
            <span>{{ item.hvacLoad }}% load - {{ item.energyBand }}</span>
          </li>
        </ul>
      </article>

      <article class="panel-card panel-card--wide">
        <p class="panel-card__eyebrow">Operational Signals</p>
        <h3>Occupancy and energy summary</h3>
        <div class="ops-grid">
          <article class="ops-card">
            <span>Current occupied seats</span>
            <strong>{{ overview.summary.totalOccupied }}</strong>
            <p>Across both floors and all currently displayed rooms.</p>
          </article>
          <article class="ops-card">
            <span>Total seat capacity</span>
            <strong>{{ overview.summary.totalCapacity }}</strong>
            <p>Use this to compare current demand against available space.</p>
          </article>
          <article class="ops-card">
            <span>Average HVAC load</span>
            <strong>{{ overview.summary.averageHvacLoad }}%</strong>
            <p>Higher values indicate ventilation or cooling pressure in active zones.</p>
          </article>
          <article class="ops-card">
            <span>Average comfort score</span>
            <strong>{{ overview.summary.averageComfort }}%</strong>
            <p>Comfort helps balance occupancy demand with environmental quality.</p>
          </article>
          <article
            v-for="item in occupancySignals"
            :key="item.name"
            class="ops-card"
          >
            <span>{{ item.name }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </article>
    </section>

    <section v-if="error" class="error-card">
      <strong>Unable to load Privaceus data.</strong>
      <p>{{ error }}</p>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import BuildingScene from "./components/BuildingScene.vue";
import StatCard from "./components/StatCard.vue";
import { fetchOverview } from "./composables/usePrivaceusApi";

const overview = ref(null);
const error = ref("");
const selectedRoomId = ref("");
const colorMode = ref("occupancy");
const explodedView = ref(false);
const upperFloorVisible = ref(true);
const roomOpacity = ref(0.9);
const sceneVersion = ref(0);
const draftOccupied = ref(0);
const draftHvacLoad = ref(0);
const updateMessage = ref("");
const currentView = ref("manager");

const percent = (value) => `${Math.round(value * 100)}%`;

const rooms = computed(() => overview.value?.floors?.flatMap((floor) => floor.rooms.map((room) => ({
  ...room,
  floorId: floor.id,
  floorName: floor.name
}))) || []);

const selectedRoom = computed(() => {
  if (!selectedRoomId.value) {
    return rooms.value[0] || null;
  }

  return rooms.value.find((room) => room.id === selectedRoomId.value) || rooms.value[0] || null;
});

const sceneKey = computed(
  () =>
    `${sceneVersion.value}-${colorMode.value}-${explodedView.value}-${upperFloorVisible.value}-${roomOpacity.value}`
);
const studentSceneKey = computed(() => `${sceneVersion.value}-student`);

watch(
  selectedRoom,
  (room) => {
    if (!room) return;
    draftOccupied.value = room.occupied;
    draftHvacLoad.value = room.hvacLoad;
  },
  { immediate: true }
);

const busiestRooms = computed(() =>
  [...rooms.value]
    .sort((a, b) => b.occupancyRate - a.occupancyRate)
    .slice(0, 4)
    .map((room) => ({
      name: room.name,
      label: `${room.occupied}/${room.capacity} occupied`,
      status: room.utilizationLabel
    }))
);

const energyAlerts = computed(() =>
  [...rooms.value]
    .filter((room) => room.hvacLoad >= 60)
    .sort((a, b) => b.hvacLoad - a.hvacLoad)
    .slice(0, 4)
    .map((room) => ({
      room: room.name,
      hvacLoad: room.hvacLoad,
      energyBand: room.energyBand
    }))
);

const occupancySignals = computed(() => {
  const overcrowded = rooms.value.filter((room) => room.occupancyRate >= 0.85).length;
  const underused = rooms.value.filter((room) => room.occupancyRate < 0.3).length;
  const highEnergy = rooms.value.filter((room) => room.hvacLoad >= 70).length;

  return [
    {
      name: "Overcrowded rooms",
      value: overcrowded,
      description: "Rooms above 85% occupancy that may need balancing or overflow support."
    },
    {
      name: "Underused rooms",
      value: underused,
      description: "Rooms below 30% occupancy that could absorb more activity."
    },
    {
      name: "High HVAC rooms",
      value: highEnergy,
      description: "Zones with elevated mechanical load that may benefit from intervention."
    }
  ];
});

function utilizationLabel(rate) {
  if (rate >= 0.85) return "Overcrowded";
  if (rate >= 0.6) return "Active";
  if (rate >= 0.3) return "Balanced";
  return "Underutilized";
}

function energyBand(load) {
  if (load >= 85) return "Critical";
  if (load >= 65) return "Elevated";
  if (load >= 40) return "Stable";
  return "Low";
}

function refreshOverviewSummary(dataset) {
  const floors = dataset.floors.map((floor) => {
    const totalCapacity = floor.rooms.reduce((sum, room) => sum + room.capacity, 0);
    const totalOccupied = floor.rooms.reduce((sum, room) => sum + room.occupied, 0);

    return {
      ...floor,
      totalCapacity,
      totalOccupied,
      occupancyRate: Number((totalOccupied / totalCapacity).toFixed(2))
    };
  });

  const allRooms = floors.flatMap((floor) => floor.rooms);
  const totalCapacity = allRooms.reduce((sum, room) => sum + room.capacity, 0);
  const totalOccupied = allRooms.reduce((sum, room) => sum + room.occupied, 0);
  const averageComfort = Math.round(allRooms.reduce((sum, room) => sum + room.comfortScore, 0) / allRooms.length);
  const averageHvacLoad = Math.round(allRooms.reduce((sum, room) => sum + room.hvacLoad, 0) / allRooms.length);

  return {
    ...dataset,
    floors,
    summary: {
      ...dataset.summary,
      totalCapacity,
      totalOccupied,
      occupancyRate: Number((totalOccupied / totalCapacity).toFixed(2)),
      averageComfort,
      averageHvacLoad
    }
  };
}

function applyRoomUpdates() {
  if (!overview.value || !selectedRoom.value) return;

  const targetRoomId = selectedRoom.value.id;

  const nextFloors = overview.value.floors.map((floor) => ({
    ...floor,
    rooms: floor.rooms.map((room) => {
      if (room.id !== targetRoomId) {
        return { ...room };
      }

      const occupied = Math.max(0, Math.min(room.capacity, Number(draftOccupied.value)));
      const hvacLoad = Math.max(0, Math.min(100, Number(draftHvacLoad.value)));
      const occupancyRate = Number((occupied / room.capacity).toFixed(2));

      return {
        ...room,
        occupied,
        available: room.capacity - occupied,
        occupancyRate,
        utilizationLabel: utilizationLabel(occupancyRate),
        hvacLoad,
        energyBand: energyBand(hvacLoad)
      };
    })
  }));

  overview.value = refreshOverviewSummary({
    ...overview.value,
    floors: nextFloors
  });

  sceneVersion.value += 1;
  updateMessage.value = `${selectedRoom.value.name} updated across the dashboard`;
}

onMounted(async () => {
  try {
    const overviewData = await fetchOverview();
    overview.value = overviewData;
    selectedRoomId.value = overviewData.floors?.[0]?.rooms?.[0]?.id || "";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unknown API error";
  }
});
</script>
