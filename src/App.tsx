import { useEffect, useState } from 'react'
import { filterProducts, summarize } from './domain/selectors'
import type { ProductSummary, StockLot, Tag } from './domain/models'
import { useInventory, useRoute } from './ui/hooks'
import { navigate } from './ui/routing'
import { dateTime, number } from './ui/format'
import Icon from './ui/Icon'
import AppMenu from './ui/AppMenu'
import ProductForm from './ui/ProductForm'
import ProductDetail from './ui/ProductDetail'
import TagManager from './ui/TagManager'
import ExpiringStock from './ui/ExpiringStock'
import ScrollList from './ui/ScrollList'
export default function App() {
  const { data, error } = useInventory()
  const route = useRoute()
  const [menu, setMenu] = useState<'menu' | 'tags' | null>(null)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [notice])
  const products = data ? summarize(data) : []
  const product = 'id' in route ? products.find((item) => item.id === route.id) : undefined
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        メインコンテンツへ
      </a>
      <header className="site-header">
        <div className="header-inner">
          <div className="header-title">
            <p className="eyebrow">A LITTLE MORE ORGANIZED</p>
            {route.page === 'list' ? <h1>おうちの在庫</h1> : <strong>おうちの在庫</strong>}
            <p className="muted">家にあるものを、ひと目で。</p>
          </div>
          <button
            className="icon-button menu-trigger"
            aria-label="メニューを開く"
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true })
              setMenu('menu')
            }}
          >
            <Icon name="menu" />
          </button>
        </div>
      </header>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-title">
            <Icon name="leaf" size={18} />
            <span>MY HOME STOCK</span>
          </div>
          <button className="nav-item active" onClick={() => navigate('/')}>
            <Icon name="box" />
            在庫一覧<span>{products.length}</span>
          </button>
          <div className="sidebar-note">
            <div className="note-line" />
            <p>
              買いすぎない。
              <br />
              使い忘れない。
            </p>
            <span>
              家にあるものを知るだけで、
              <br />
              毎日の暮らしが少し軽く。
            </span>
          </div>
          <p className="local-label">
            <Icon name="shield" size={15} />
            この端末に保存
          </p>
        </aside>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {error ? (
            <div className="panel empty-state">
              <h1>データを読み込めませんでした</h1>
              <p role="alert">{error}</p>
              <button className="button primary" onClick={() => window.location.reload()}>
                再読み込み
              </button>
            </div>
          ) : !data ? (
            <p className="loading" role="status">
              在庫を読み込んでいます…
            </p>
          ) : route.page === 'list' ? (
            <ProductList products={products} tags={data.tags} lots={data.stockLots} />
          ) : route.page === 'new' ? (
            <ProductForm key="new" tags={data.tags} onSaved={setNotice} />
          ) : !product ? (
            <div className="panel empty-state">
              <h1>商品が見つかりません</h1>
              <p>復元によってデータが変更された可能性があります。</p>
              <button className="button primary" onClick={() => navigate('/')}>
                一覧に戻る
              </button>
            </div>
          ) : route.page === 'edit' ? (
            <ProductForm key={product.id} product={product} tags={data.tags} onSaved={setNotice} />
          ) : (
            <ProductDetail
              key={product.id}
              product={product}
              tags={data.tags}
              lots={data.stockLots.filter((lot) => lot.productId === product.id)}
              transactions={data.stockTransactions.filter((tx) => tx.productId === product.id)}
              onSaved={setNotice}
            />
          )}
          <footer className="storage-notice">
            <Icon name="shield" size={17} />
            <p>
              変更は操作確定時に、このブラウザ・端末内へ自動保存します。
              <br />
              バックアップは任意です。端末故障などに備えたいときは、メニューから保存できます。
            </p>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {notice}
        </div>
      )}
      {menu === 'menu' && (
        <AppMenu
          onClose={() => setMenu(null)}
          onNotice={setNotice}
          productCount={products.length}
          onManageTags={() => setMenu('tags')}
        />
      )}
      {menu === 'tags' && data && (
        <TagManager
          tags={data.tags}
          links={data.productTags}
          onClose={() => setMenu(null)}
          onSaved={setNotice}
        />
      )}
    </>
  )
}
function ProductList({ products, tags, lots }: { products: ProductSummary[]; tags: Tag[]; lots: StockLot[] }) {
  const [search, setSearch] = useState('')
  const [tagMode, setTagMode] = useState<'and' | 'or'>('and')
  const [selected, setSelected] = useState<string[]>([])
  const validSelected = selected.filter((id) => tags.some((tag) => tag.id === id))
  const filtered = filterProducts(products, search, validSelected, tagMode)
  return (
    <section>
        <button className="button primary add-product" onClick={() => navigate('/new')}>
          <Icon name="plus" />
          商品を登録
        </button>
      <ExpiringStock products={products} lots={lots} />
      <div className="search-area">
        <label className="search-box">
          <Icon name="search" />
          <input
            type="search"
            aria-label="商品名で検索"
            placeholder="商品名・別名で探す"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {tags.length > 0 && (
          <div className="filter-row">
            <label className="tag-mode">タグの条件
              <select aria-label="タグの検索条件" value={tagMode} onChange={(event) => setTagMode(event.target.value as 'and' | 'or')}>
                <option value="and">AND（すべて含む）</option>
                <option value="or">OR（いずれかを含む）</option>
              </select>
            </label>
            <span className="filter-label">
              <Icon name="tag" size={16} />
              タグ
            </span>
            <button
              className={`chip ${validSelected.length === 0 ? 'selected' : ''}`}
              aria-pressed={validSelected.length === 0}
              onClick={() => setSelected([])}
            >
              すべて
            </button>
            {[...tags]
              .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
              .map((tag) => (
                <button
                  key={tag.id}
                  className={`chip ${validSelected.includes(tag.id) ? 'selected' : ''}`}
                  aria-pressed={validSelected.includes(tag.id)}
                  onClick={() =>
                    setSelected(
                      validSelected.includes(tag.id)
                        ? validSelected.filter((id) => id !== tag.id)
                        : [...validSelected, tag.id],
                    )
                  }
                >
                  {tag.name}
                </button>
              ))}
          </div>
        )}
        {validSelected.length > 1 && (
          <p className="field-help mt-2">{tagMode === 'and' ? '選択したすべてのタグを含む商品を表示しています。' : '選択したいずれかのタグを含む商品を表示しています。'}</p>
        )}
      </div>
      <div className="list-heading">
        <h2>
          在庫一覧 <span>{filtered.length} 件</span>
        </h2>
        <span>最終操作が新しい順</span>
      </div>
      {products.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-illustration">
            <Icon name="box" size={48} />
            <span className="tiny-leaf">
              <Icon name="leaf" size={22} />
            </span>
          </div>
          <h2>まずは、ひとつ登録してみましょう</h2>
          <p>
            冷蔵庫の牛乳も、棚のストックも。
            <br />
            身近なものから、在庫管理をはじめられます。
          </p>
          <button className="button primary" onClick={() => navigate('/new')}>
            <Icon name="plus" />
            はじめての商品を登録
          </button>
          <small>在庫が0個の商品も登録できます。</small>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel empty-state">
          <Icon name="search" size={32} />
          <h2>一致する商品がありません</h2>
          <p>商品名やタグの条件を変えてみてください。</p>
          <button
            className="button secondary"
            onClick={() => {
              setSearch('')
              setSelected([])
            }}
          >
            絞り込みを解除
          </button>
        </div>
      ) : (
        <ScrollList label="商品一覧">
          <div className="product-list">
            {filtered.map((product) => (
              <button
                className="product-card"
                key={product.id}
                onClick={() => navigate(`/products/${product.id}`)}
              >
                <span className="product-icon">
                  <Icon name="box" size={23} />
                </span>
                <span className="product-info">
                  <strong>{product.name}</strong>
                  {!!product.aliases?.length && <span className="product-aliases">別名：{product.aliases.join('、')}</span>}
                  <span className="product-tags">
                    {product.tags.length ? (
                      product.tags.map((tag) => (
                        <span className="tag-label" key={tag.id}>
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="no-tag">タグなし</span>
                    )}
                  </span>
                  <span className="product-date">
                    <Icon name="clock" size={12} />
                    最終操作 {dateTime(product.lastOperatedAt)}
                  </span>
                </span>
                <span className={`stock-count ${product.total === 0 ? 'zero' : ''}`}>
                  <strong>{number(product.total)}</strong>
                  <small>個</small>
                </span>
                <span className="card-chevron">
                  <Icon name="arrow" size={17} />
                </span>
              </button>
            ))}
          </div>
        </ScrollList>
      )}
    </section>
  )
}
