<template>
  <section>
    <h1>รายงานผลประเมิน</h1>
    <div class="actions no-print">
      <v-btn color="primary" @click="print">พิมพ์ / บันทึก PDF</v-btn>
      <v-btn
        color="primary"
        :loading="exporting"
        :disabled="loading || (!report && !result)"
        @click="downloadPdf"
        >ดาวน์โหลด PDF</v-btn
      >
      <v-btn v-if="report && result" @click="result = null">กลับภาพรวม</v-btn>
    </div>
    <div ref="printArea" class="report-paper">
      <h2>รายงานผลการประเมินบุคลากร</h2>
      <template v-if="report && !result">
        <div class="box">
          <h2>{{ report.period.name }}</h2>
          <p>
            ผู้รับทั้งหมด {{ report.results.length }} คน · ผลครบ
            {{ report.results.filter((r) => r.total !== null).length }} คน
          </p>
          <p class="big-number">
            เฉลี่ยเฉพาะผู้ที่ผลครบ:
            {{ report.average === null ? 'ยังไม่มีผล' : report.average + '%' }}
          </p>
        </div>
        <article class="box" v-for="r in report.results" :key="r.person.id">
          <h2>{{ r.person.full_name }}</h2>
          <p>
            ผู้รับ: บันทึกครบ {{ r.self_complete }}/{{ r.indicators.length }} ข้อ ·
            {{ r.person.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}
          </p>
          <p>ผลรวม: {{ r.total === null ? 'ยังไม่ครบ' : r.total + '%' }}</p>
          <v-table class="table-wrap">
            <thead>
              <tr>
                <th>กรรมการ</th>
                <th>ความคืบหน้า</th>
                <th>ส่งผล</th>
                <th>คะแนน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in r.committees">
                <td>{{ c.full_name }}</td>
                <td>{{ c.scores.length }}/{{ r.indicators.length }}</td>
                <td>{{ c.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}</td>
                <td>
                  {{
                    c.percentage === null
                      ? 'ยังไม่ครบ'
                      : c.percentage + '%' + (c.submitted ? '' : ' (ร่าง)')
                  }}
                </td>
              </tr>
            </tbody>
          </v-table>
          <v-btn class="no-print" @click="select(r.person.id)">ดูรายบุคคล</v-btn>
        </article>
      </template>
      <template v-if="result">
        <div class="box">
          <h2>{{ result.person.full_name }}</h2>
          <p>{{ result.period.name }} · ปี {{ result.period.year }}</p>
          <p class="big-number">
            ผลรวม: {{ result.total === null ? 'ยังไม่ครบ' : result.total + '%' }}
          </p>
          <p>ค่าเฉลี่ยคะแนนกรรมการน้ำหนักเท่ากันทุกคน</p>
        </div>
        <article class="box committee" v-for="c in result.committees" :key="c.id">
          <h2>
            {{ c.full_name }} —
            {{ c.committee_role === 'chair' ? 'ประธาน' : 'กรรมการร่วม' }}
          </h2>
          <p>
            ผล: {{ c.percentage === null ? 'ยังไม่ครบ' : c.percentage + '%' }} ·
            {{ c.submitted ? 'ส่งแล้ว' : 'ร่าง ยังไม่ใช่ผลสุดท้าย' }}
          </p>
          <v-table class="table-wrap">
            <thead>
              <tr>
                <th>หัวข้อ / ตัวชี้วัด</th>
                <th>น้ำหนัก</th>
                <th>คะแนน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in result.indicators">
                <td>{{ i.topic }} / {{ i.name }}</td>
                <td>{{ i.weight }}</td>
                <td>{{ score(c, i) }}</td>
              </tr>
            </tbody>
          </v-table>
          <p>ความเห็น: {{ c.comment || 'ยังไม่มี' }}</p>
          <img
            v-if="signatures[c.id]"
            class="signature"
            :src="signatures[c.id]"
            alt="ลายเซ็นกรรมการ"
          />
        </article>
      </template>
    </div>
  </section>
</template>

<script>
import { api, fileBlob } from '../api';

export default {
  props: ['periodId', 'participantId'],
  data() {
    return { report: null, result: null, signatures: {}, loading: true, exporting: false };
  },
  async mounted() {
    try {
      if (this.participantId) await this.select(this.participantId);
      else this.report = await api('/reports/' + this.periodId);
    } finally {
      this.loading = false;
    }
  },
  beforeUnmount() {
    for (const url of Object.values(this.signatures)) URL.revokeObjectURL(url);
  },
  methods: {
    async select(id) {
      this.loading = true;
      try {
        this.result = await api('/results/' + id);
        for (const url of Object.values(this.signatures)) URL.revokeObjectURL(url);
        this.signatures = {};
        for (const c of this.result.committees)
          if (c.signature) this.signatures[c.id] = await fileBlob('/signatures/' + c.id);
      } finally {
        this.loading = false;
      }
    },
    score(c, i) {
      const s = c.scores.find((s) => s.indicator_id === i.id);
      return s ? s.score : 'ยังไม่กรอก';
    },
    print() {
      window.print();
    },
    async downloadPdf() {
      if (this.exporting || this.loading) return;
      this.exporting = true;
      let paper;
      try {
        await document.fonts.ready;
        // คัดลอกรายงานเป็นกระดาษขนาดคงที่ จึงส่งออกได้แม้เปิดบนจอเล็ก
        paper = this.$refs.printArea.cloneNode(true);
        paper.style.cssText =
          'width:720px;padding:16px;background:white;color:#222;font-family:Tahoma,sans-serif;';
        paper.querySelectorAll('.no-print').forEach((node) => node.remove());
        paper.querySelectorAll('.v-table__wrapper').forEach((node) => {
          node.style.overflow = 'visible';
        });
        const html2pdf = (await import('html2pdf.js')).default;
        await html2pdf()
          .set({
            filename: 'evaluation-' + (this.participantId || this.periodId || 'report') + '.pdf',
            margin: 10,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.signature', 'h2', '.committee'] },
          })
          .from(paper)
          .save();
        this.$root.message = 'สร้าง PDF แล้ว ตรวจไฟล์ในรายการดาวน์โหลด';
      } finally {
        this.exporting = false;
      }
    },
  },
};
</script>
