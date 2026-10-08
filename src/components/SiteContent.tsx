import { ContactForm } from './ContactForm';

const processStages = [
  {
    number: '01', kicker: '第一階段｜行銷之前', title: '先看懂生意，再決定怎麼做行銷。',
    lead: '你的產品優勢是什麼？誰最有可能購買？目前的成長卡在哪裡？',
    body: '我們從商業目標、客群與市場資訊出發，釐清品牌定位、溝通主張與媒體選擇，建立策略，也先規劃成效如何追蹤。',
    tags: ['商業目標', '客群洞察', '品牌定位', '成效指標'],
  },
  {
    number: '02', kicker: '第二階段｜行銷執行', title: '讓策略成為看得見、能執行的創意。',
    lead: '從廣告主張、視覺設計到內容製作與媒體投放，我們把不同環節整合成同一個方向。',
    body: '執行期間持續觀察市場反應，在約定的合作範圍內調整素材、訊息與投放配置，讓創意與策略一起前進。',
    tags: ['創意主張', '視覺設計', '內容製作', '媒體投放'],
  },
  {
    number: '03', kicker: '第三階段｜成效回饋', title: '廣告上線後，繼續找出下一步。',
    lead: '哪些訊息帶來詢問？哪些素材吸引了對的客群？預算應該往哪裡調整？',
    body: '我們依據可取得的廣告、詢問與銷售資料，檢視成效與轉換過程，提出具體調整建議，讓下一次決策有跡可循。',
    tags: ['成效追蹤', '問題判讀', '調整建議', '持續優化'],
  },
];

const services = [
  ['01', '行銷策略與品牌溝通', '釐清品牌定位、目標客群、產品優勢與溝通主張，規劃活動方向、內容節奏與媒體配置。'],
  ['02', '創意設計與內容製作', '將策略轉化為廣告視覺、社群內容、活動素材、網站內容與影像，建立一致且有辨識度的品牌溝通。'],
  ['03', '廣告投放與媒體規劃', '依據客群與活動目標，規劃數位廣告及戶外媒體組合，協調素材需求、投放安排與預算配置。'],
  ['04', '成效分析與優化', '整理可取得的成效資料，分析訊息、素材與轉換流程，提出下一階段的優化方向。'],
];

const audiences = [
  ['01', '傳統企業與製造業', '把累積多年的產品、技術與服務優勢，轉化為客戶容易理解的品牌訊息，支援市場開發與業務溝通。'],
  ['02', '新創與成長型企業', '在建立完整團隊之前，先整合必要的策略、設計與廣告工作，以明確的範圍與節奏推進行銷。'],
  ['03', '已有行銷團隊的企業', '支援特定活動、創意製作與成效分析，補足專案所需能力，協助內部團隊完成階段目標。'],
];

const methods = [
  ['方式一', '專案合作', '適合新品推出、品牌重塑、廣告活動與階段性推廣。依照目標確認策略、製作內容、執行時程與成效檢視方式。'],
  ['方式二', '月度合作', '適合需要持續經營內容、設計與廣告的企業。約定每月工作範圍與優先順序，定期檢視成果並調整方向。'],
  ['方式三', '策略與創意支援', '適合已有執行團隊，但需要外部觀點或特定專業支援的企業。依照需求提供策略規劃、創意方向或成效分析。'],
];

export function SiteContent() {
  return (
    <>
      <section id="approach" className="process-section site-section">
        <div className="section-shell">
          <header className="section-intro">
            <p className="section-label">我們的做法</p>
            <h2>從商業問題出發，<br />讓每個環節朝同一個方向前進。</h2>
          </header>
          <div className="process-list">
            {processStages.map((stage) => (
              <article className="process-item" key={stage.number}>
                <div className="process-number">{stage.number}</div>
                <div className="process-copy">
                  <p className="process-kicker">{stage.kicker}</p>
                  <h3>{stage.title}</h3>
                  <p>{stage.lead}</p><p>{stage.body}</p>
                  <ul>{stage.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                </div>
                <div className={`process-signal signal-${stage.number}`} aria-hidden="true"><i /><i /><i /></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="services-section site-section">
        <div className="section-shell">
          <header className="section-intro split-intro">
            <div><p className="section-label">服務內容</p><h2>依照你的目標，<br />整合需要的行銷工作。</h2></div>
            <p>從單次活動到長期合作，先釐清要解決的問題，再安排適合的服務與執行範圍。</p>
          </header>
          <div className="service-list">
            {services.map(([number, title, body]) => (
              <article className="service-item" key={number}>
                <span>{number}</span><h3>{title}</h3><p>{body}</p><i aria-hidden="true">↗</i>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="audience-section site-section">
        <div className="section-shell">
          <header className="section-intro split-intro">
            <div><p className="section-label">適合的合作對象</p><h2>企業走到不同階段，<br />需要不同的行銷支援。</h2></div>
          </header>
          <div className="audience-grid">
            {audiences.map(([number, title, body]) => (
              <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section id="collaboration" className="collaboration-section site-section">
        <div className="section-shell collaboration-layout">
          <header className="section-intro sticky-intro">
            <p className="section-label">合作方式</p><h2>從一次活動，<br />到持續推進品牌。</h2>
          </header>
          <div className="method-list">
            {methods.map(([number, title, body]) => (
              <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>
            ))}
            <p className="method-note">合作前確認工作範圍、交付內容、修改安排與費用。媒體預算與第三方製作費另行列明，讓投入與責任清楚可控。</p>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section site-section">
        <div className="contact-glow" aria-hidden="true" />
        <div className="section-shell contact-layout">
          <div className="contact-copy">
            <p className="section-label">聯絡合作</p>
            <h2>讓你的下一步，<br />有清楚的行銷方向。</h2>
            <p>告訴我們你的產品、目前遇到的問題，以及想達成的目標。我們會從需求出發，討論適合的合作方式。</p>
          </div>
          <ContactForm />
        </div>
      </section>

      <footer className="site-footer">
        <div className="section-shell footer-main"><p>PIKHUO <small>拾火創意</small></p><span>行銷策略・創意設計・廣告投放・成效分析</span></div>
        <div className="section-shell footer-bottom"><span>© {new Date().getFullYear()} 拾火創意 PIKHUO</span><a href="#top">回到頂部 ↑</a></div>
      </footer>
    </>
  );
}
