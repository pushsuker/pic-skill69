<template>
  <section>
    <h1>รอบประเมินและเกณฑ์</h1>
    <div class="actions">
      <v-text-field v-model="year" type="number" label="กรองปี ค.ศ." />
      <v-btn @click="load">ค้นหา</v-btn>
      <v-btn @click="newPeriod">สร้างรอบใหม่</v-btn>
    </div>
    <v-table class="table-wrap">
      <thead>
        <tr>
          <th>รอบ</th>
          <th>ปี</th>
          <th>สถานะ</th>
          <th>เปิด</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in periods" :key="p.id">
          <td>{{ p.name }}</td>
          <td>{{ p.year }}</td>
          <td>{{ p.status }}</td>
          <td>
            <v-btn size="small" @click="select(p.id)">จัดการรอบ</v-btn>
            <v-btn size="small" variant="text" @click="$emit('report', p.id)"> รายงาน </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
    <div class="box">
      <h2>{{ data ? 'ข้อมูลรอบที่เลือก' : 'สร้างรอบ' }}</h2>
      <form @submit.prevent="savePeriod">
        <div class="grid">
          <v-text-field
            v-model="form.name"
            required
            :disabled="data && !draft"
            maxlength="100"
            label="ชื่อรอบ"
          />
          <v-text-field
            v-model.number="form.year"
            type="number"
            min="2000"
            max="2100"
            required
            :disabled="data && !draft"
            label="ปี ค.ศ."
          />
          <v-text-field
            v-model="form.start_date"
            type="date"
            required
            :disabled="data && !draft"
            label="วันเริ่ม"
          />
          <v-text-field
            v-model="form.end_date"
            type="date"
            required
            :min="form.start_date"
            :disabled="data && !draft"
            label="วันสิ้นสุด"
          />
        </div>
        <v-btn v-if="!data || draft" type="submit" color="primary">บันทึกรอบ</v-btn>
      </form>
    </div>
    <template v-if="data">
      <div class="box">
        <h2>1. หัวข้อและตัวชี้วัด</h2>
        <p>สถานะ: {{ data.period.status }} — หลังเปิดรอบจะแก้เกณฑ์ไม่ได้</p>
        <form v-if="draft" @submit.prevent="saveTopic">
          <v-text-field v-model="topic" required maxlength="100" label="ชื่อหัวข้อ" />
          <v-btn type="submit">{{ topicId ? 'บันทึกชื่อหัวข้อ' : 'เพิ่มหัวข้อ' }}</v-btn>
        </form>
        <p v-for="t in data.topics" :key="t.id">
          {{ t.name }}
          <v-btn
            v-if="draft"
            size="small"
            variant="text"
            @click="
              topic = t.name;
              topicId = t.id;
            "
          >
            แก้ชื่อ
          </v-btn>
        </p>
        <hr />
        <form v-if="draft" @submit.prevent="saveIndicator">
          <h3>{{ indicator.id ? 'แก้ตัวชี้วัด' : 'เพิ่มตัวชี้วัด' }}</h3>
          <div class="grid">
            <v-select
              v-model="indicator.topic_id"
              required
              :disabled="!!indicator.id"
              :items="data.topics"
              item-title="name"
              item-value="id"
              label="หัวข้อ"
            />
            <v-text-field v-model="indicator.name" required maxlength="150" label="ชื่อตัวชี้วัด" />
          </div>
          <v-textarea
            v-model="indicator.detail"
            maxlength="2000"
            label="รายละเอียด / คำแนะนำหลักฐาน"
          />
          <div class="grid">
            <v-text-field
              v-model.number="indicator.weight"
              type="number"
              min="0.01"
              max="10000"
              step="0.01"
              required
              label="น้ำหนัก"
            />
            <v-select
              v-model="indicator.score_type"
              :items="[
                { title: 'ระดับ 1–4', value: 'scale4' },
                { title: 'มี / ไม่มี', value: 'boolean' },
              ]"
              label="ชนิดคะแนน"
            />
            <v-select
              v-model="indicator.evidence_type"
              @update:model-value="indicator.evidence_required = indicator.evidence_type !== 'none'"
              :items="[
                { title: 'ไม่ใช้', value: 'none' },
                { title: 'ไฟล์ PDF / รูปภาพ', value: 'file' },
                { title: 'URL', value: 'url' },
              ]"
              label="หลักฐาน"
            />
            <v-checkbox
              v-model="indicator.evidence_required"
              :disabled="indicator.evidence_type === 'none'"
              label="บังคับแนบหลักฐาน"
            />
          </div>
          <v-btn type="submit" color="primary">บันทึกตัวชี้วัด</v-btn>
        </form>
        <v-table class="table-wrap">
          <thead>
            <tr>
              <th>หัวข้อ / ตัวชี้วัด</th>
              <th>น้ำหนัก</th>
              <th>คะแนน / หลักฐาน</th>
              <th v-if="draft">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in data.indicators" :key="i.id">
              <td>
                {{ i.topic }} / {{ i.name }}
                <p>{{ i.detail }}</p>
              </td>
              <td>{{ i.weight }}</td>
              <td>
                {{ i.score_type }} / {{ i.evidence_type }}
                {{ i.evidence_required ? '(บังคับ)' : '' }}
              </td>
              <td v-if="draft">
                <v-btn
                  size="small"
                  @click="indicator = { ...i, evidence_required: Boolean(i.evidence_required) }"
                  >แก้</v-btn
                >
                <v-btn size="small" @click="removeIndicator(i.id)">ลบ</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
      <div class="box">
        <h2>2. ผู้รับการประเมิน</h2>
        <form v-if="draft" @submit.prevent="addPerson">
          <v-select
            v-model="person"
            required
            :items="users.filter((u) => u.role === 'evaluatee' && u.active)"
            item-title="full_name"
            item-value="id"
            label="ผู้รับ"
          />
          <v-btn type="submit">เพิ่มเข้ารอบ</v-btn>
        </form>
        <p v-for="p in data.participants">
          {{ p.full_name }} — {{ p.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}
        </p>
      </div>
      <div class="box">
        <h2>3. มอบหมายกรรมการ</h2>
        <form v-if="draft" @submit.prevent="assign">
          <div class="grid">
            <v-select
              v-model="assignment.participant_id"
              required
              :items="data.participants"
              item-title="full_name"
              item-value="id"
              label="ผู้รับในรอบ"
            />
            <v-select
              v-model="assignment.evaluator_id"
              required
              :items="users.filter((u) => u.role === 'evaluator' && u.active)"
              item-title="full_name"
              item-value="id"
              label="กรรมการ"
            />
            <v-select
              v-model="assignment.committee_role"
              :items="[
                { title: 'ประธาน', value: 'chair' },
                { title: 'กรรมการร่วม', value: 'member' },
              ]"
              label="หน้าที่"
            />
          </div>
          <v-btn type="submit">มอบหมาย</v-btn>
        </form>
        <v-table class="table-wrap">
          <thead>
            <tr>
              <th>ผู้รับ</th>
              <th>กรรมการ</th>
              <th>หน้าที่</th>
              <th>สถานะ</th>
              <th v-if="draft">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in data.assignments">
              <td>{{ a.evaluatee_name }}</td>
              <td>{{ a.evaluator_name }}</td>
              <td>{{ a.committee_role === 'chair' ? 'ประธาน' : 'กรรมการร่วม' }}</td>
              <td>{{ a.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}</td>
              <td v-if="draft">
                <v-btn size="small" @click="unassign(a.id)">ถอนมอบหมาย</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
      <div class="box">
        <h2>4. เปิดรอบ / เผยแพร่ / ปิดรอบ</h2>
        <p>เปิดรอบเมื่อหัวข้อ ตัวชี้วัด ผู้รับ และประธานครบแล้ว เผยแพร่ได้เมื่อทุกคนส่งครบ</p>
        <div class="actions">
          <v-btn v-if="draft" color="primary" @click="action('open')">เปิดรอบ</v-btn>
          <v-btn v-if="!draft && !data.period.published" color="primary" @click="action('publish')">
            เผยแพร่ผล
          </v-btn>
          <v-btn v-if="data.period.status === 'open'" @click="action('close')"> ปิดรอบ </v-btn>
          <span v-if="data.period.published">เผยแพร่แล้ว</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import { api } from '../api';

export default {
  data() {
    return {
      periods: [],
      users: [],
      data: null,
      year: '',
      topic: '',
      topicId: null,
      form: { name: '', year: new Date().getFullYear(), start_date: '', end_date: '' },
      indicator: {
        topic_id: '',
        name: '',
        detail: '',
        weight: 100,
        score_type: 'scale4',
        evidence_type: 'file',
        evidence_required: true,
      },
      person: '',
      assignment: { participant_id: '', evaluator_id: '', committee_role: 'chair' },
    };
  },
  async mounted() {
    await this.load();
    this.users = await api('/users');
  },
  computed: {
    draft() {
      return this.data && this.data.period.status === 'draft';
    },
  },
  methods: {
    async load() {
      this.periods = await api('/periods' + (this.year ? '?year=' + this.year : ''));
    },
    async select(id) {
      this.data = await api('/periods/' + id);
      this.form = { ...this.data.period };
      this.topic = '';
      this.topicId = null;
      this.indicator = {
        topic_id: '',
        name: '',
        detail: '',
        weight: 100,
        score_type: 'scale4',
        evidence_type: 'file',
        evidence_required: true,
      };
      this.assignment = { participant_id: '', evaluator_id: '', committee_role: 'chair' };
      this.person = '';
    },
    newPeriod() {
      this.data = null;
      this.form = { name: '', year: new Date().getFullYear(), start_date: '', end_date: '' };
    },
    async savePeriod() {
      if (this.data) {
        await api('/periods/' + this.data.period.id, 'PUT', this.form);
        await this.select(this.data.period.id);
      } else {
        const r = await api('/periods', 'POST', this.form);
        await this.select(r.id);
      }
      await this.load();
      this.$root.message = 'บันทึกรอบแล้ว';
    },
    async reload() {
      const id = this.data.period.id;
      await this.select(id);
      await this.load();
    },
    async saveTopic() {
      await api(
        this.topicId ? '/topics/' + this.topicId : '/periods/' + this.data.period.id + '/topics',
        this.topicId ? 'PUT' : 'POST',
        { name: this.topic },
      );
      await this.reload();
    },
    async saveIndicator() {
      await api(
        '/indicators' + (this.indicator.id ? '/' + this.indicator.id : ''),
        this.indicator.id ? 'PUT' : 'POST',
        this.indicator,
      );
      await this.reload();
    },
    async removeIndicator(id) {
      if (confirm('ลบตัวชี้วัดนี้?')) {
        await api('/indicators/' + id, 'DELETE');
        await this.reload();
      }
    },
    async addPerson() {
      await api('/periods/' + this.data.period.id + '/participants', 'POST', {
        user_id: this.person,
      });
      await this.reload();
    },
    async assign() {
      await api('/assignments', 'POST', this.assignment);
      await this.reload();
    },
    async unassign(id) {
      await api('/assignments/' + id, 'DELETE');
      await this.reload();
    },
    async action(name) {
      if (confirm('ยืนยัน ' + name + ' รอบนี้?')) {
        await api('/periods/' + this.data.period.id + '/' + name, 'POST');
        await this.reload();
        this.$root.message = 'เปลี่ยนสถานะแล้ว';
      }
    },
  },
};
</script>
