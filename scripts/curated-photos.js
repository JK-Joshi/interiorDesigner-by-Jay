/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CURATED UNSPLASH PHOTOS
 *  One hand-picked photo per image slot, chosen to match each caption and to
 *  suit the studio's palette. Used by `npm run fetch:images` with no API key:
 *  the files are pulled straight from Unsplash's image CDN, cropped to the exact
 *  size each slot declares.
 *
 *  Values are Unsplash photo IDs — the part after "photo-" in an image URL:
 *    https://images.unsplash.com/photo-1533779283484-8ad4940aa3a8
 *
 *  To swap a photo: open the picture on unsplash.com, copy the image address and
 *  paste the id here, then run `npm run fetch:images -- --force --only=<group>`.
 *
 *  All photos are under the Unsplash License (free for commercial use, no
 *  permission needed). They are placeholders — replace them with the studio's
 *  own photography before launch.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const curatedPhotos = {
  // ── The Terracotta House — warm earth, lime plaster, teak ──────────────────
  '/images/projects/the-terracotta-house/01.jpg': '1533779283484-8ad4940aa3a8',
  '/images/projects/the-terracotta-house/02.jpg': '1583845112239-97ef1341b271',
  '/images/projects/the-terracotta-house/03.jpg': '1600210492486-724fe5c67fb0',
  '/images/projects/the-terracotta-house/04.jpg': '1502005229762-cf1b2da7c5d6',
  '/images/projects/the-terracotta-house/05.jpg': '1519710164239-da123dc03ef4',
  '/images/projects/the-terracotta-house/06.jpg': '1609766857041-ed402ea8069a',
  '/images/projects/the-terracotta-house/07.jpg': '1507652313519-d4e9174996dd',
  '/images/projects/the-terracotta-house/08.jpg': '1600607688969-a5bfcd646154',

  // ── Linen Penthouse — oat, ivory, smoke ────────────────────────────────────
  '/images/projects/linen-penthouse/01.jpg': '1600210492493-0946911123ea',
  '/images/projects/linen-penthouse/02.jpg': '1631679706909-1844bbd07221',
  '/images/projects/linen-penthouse/03.jpg': '1565193566173-7a0ee3dbe261',
  '/images/projects/linen-penthouse/04.jpg': '1617806118233-18e1de247200',
  '/images/projects/linen-penthouse/05.jpg': '1543248939-4296e1fea89b',
  '/images/projects/linen-penthouse/06.jpg': '1595526114035-0d45ed16cfbf',
  '/images/projects/linen-penthouse/07.jpg': '1564540583246-934409427776',

  // ── Stone & Teak Villa — long, low, landscape-bound ────────────────────────
  '/images/projects/stone-and-teak-villa/01.jpg': '1600585154340-be6161a56a0c',
  '/images/projects/stone-and-teak-villa/02.jpg': '1611048267451-e6ed903d4a38',
  '/images/projects/stone-and-teak-villa/03.jpg': '1600585154526-990dced4db0d',
  '/images/projects/stone-and-teak-villa/04.jpg': '1512917774080-9991f1c4c750',
  '/images/projects/stone-and-teak-villa/05.jpg': '1600585152220-90363fe7e115',
  '/images/projects/stone-and-teak-villa/06.jpg': '1524995997946-a1c2e315a42f',
  '/images/projects/stone-and-teak-villa/07.jpg': '1600607688066-890987f18a86',
  '/images/projects/stone-and-teak-villa/08.jpg': '1513519245088-0e12902e5a38',
  '/images/projects/stone-and-teak-villa/09.jpg': '1600585153490-76fb20a32601',

  // ── Brass Courtyard Residence — heritage, arches, brass ────────────────────
  '/images/projects/brass-courtyard-residence/01.jpg': '1618219944342-824e40a13285',
  '/images/projects/brass-courtyard-residence/02.jpg': '1615873968403-89e068629265',
  '/images/projects/brass-courtyard-residence/03.jpg': '1600210491892-03d54c0aaf87',
  '/images/projects/brass-courtyard-residence/04.jpg': '1600607686527-6fb886090705',
  '/images/projects/brass-courtyard-residence/05.jpg': '1539020140153-e479b8c22e70',
  '/images/projects/brass-courtyard-residence/06.jpg': '1517248135467-4c7edcad34c4',
  '/images/projects/brass-courtyard-residence/07.jpg': '1615529162924-f8605388461d',
  '/images/projects/brass-courtyard-residence/08.jpg': '1600566753086-00f18fb6b3ea',

  // ── Monsoon Retreat — rain, moss, slate, fire ──────────────────────────────
  '/images/projects/monsoon-retreat/01.jpg': '1493314894560-5c412a56c17c',
  '/images/projects/monsoon-retreat/02.jpg': '1449158743715-0a90ebb6d2d8',
  '/images/projects/monsoon-retreat/03.jpg': '1615874694520-474822394e73',
  '/images/projects/monsoon-retreat/04.jpg': '1600607687939-ce8a6c25118c',
  '/images/projects/monsoon-retreat/05.jpg': '1552858725-2758b5fb1286',
  '/images/projects/monsoon-retreat/06.jpg': '1587061949409-02df41d5e562',
  '/images/projects/monsoon-retreat/07.jpg': '1620626011761-996317b8d101',

  // ── The Atelier Office — workplace with the calm of a studio ───────────────
  '/images/projects/the-atelier-office/01.jpg': '1497366811353-6870744d04b2',
  '/images/projects/the-atelier-office/02.jpg': '1504384308090-c894fdcc538d',
  '/images/projects/the-atelier-office/03.jpg': '1517502884422-41eaead166d4',
  '/images/projects/the-atelier-office/04.jpg': '1497366754035-f200968a6e72',
  '/images/projects/the-atelier-office/05.jpg': '1534349762230-e0cadf78f5da',
  '/images/projects/the-atelier-office/06.jpg': '1524758631624-e2822e304c36',

  // ── Ivory Suite Hotel — hospitality ────────────────────────────────────────
  '/images/projects/ivory-suite-hotel/01.jpg': '1596436889106-be35e843f974',
  '/images/projects/ivory-suite-hotel/02.jpg': '1615529182904-14819c35db37',
  '/images/projects/ivory-suite-hotel/03.jpg': '1618773928121-c32242e63f39',
  '/images/projects/ivory-suite-hotel/04.jpg': '1604709177225-055f99402ea3',
  '/images/projects/ivory-suite-hotel/05.jpg': '1600093463592-8e36ae95ef56',
  '/images/projects/ivory-suite-hotel/06.jpg': '1524230572899-a752b3835840',
  '/images/projects/ivory-suite-hotel/07.jpg': '1572116469696-31de0f17cc34',
  '/images/projects/ivory-suite-hotel/08.jpg': '1540555700478-4be289fbecef',

  // ── Sandalwood Café — cane, brass, coffee ──────────────────────────────────
  '/images/projects/sandalwood-cafe/01.jpg': '1453614512568-c4024d13c247',
  '/images/projects/sandalwood-cafe/02.jpg': '1568992687947-868a62a9f521',
  '/images/projects/sandalwood-cafe/03.jpg': '1618219908412-a29a1bb7b86e',
  '/images/projects/sandalwood-cafe/04.jpg': '1493925410384-84f842e616fb',
  '/images/projects/sandalwood-cafe/05.jpg': '1554118811-1e0d58224f24',
  '/images/projects/sandalwood-cafe/06.jpg': '1551632436-cbf8dd35adfa',
  '/images/projects/sandalwood-cafe/07.jpg': '1540932239986-30128078f3c5',

  // ── The studio (About page) ────────────────────────────────────────────────
  '/images/studio/hero.jpg': '1536376072261-38c75010e6c9',
  '/images/studio/founder.jpg': '1494790108377-be9c29b29330',
  '/images/studio/story-01.jpg': '1530018607912-eff2daa1bac4',
  '/images/studio/story-02.jpg': '1558618666-fcd25c85cd64',
  '/images/studio/story-03.jpg': '1618221195710-dd6b41faaea6',
  '/images/studio/gallery-01.jpg': '1452860606245-08befc0ff44b',
  '/images/studio/gallery-02.jpg': '1519974719765-e6559eac2575',
  '/images/studio/gallery-03.jpg': '1533090161767-e6ffed986c88',
  '/images/studio/gallery-04.jpg': '1584589167171-541ce45f1eea',
  '/images/studio/gallery-05.jpg': '1513161455079-7dc1de15ef3e',
  '/images/studio/gallery-06.jpg': '1594026112284-02bb6f3352fe',
  '/images/studio/gallery-07.jpg': '1567225557594-88d73e55f2cb',
  '/images/studio/gallery-08.jpg': '1595246140625-573b715d11dc',
  '/images/studio/gallery-09.jpg': '1597218868981-1b68e15f0065',

  // ── Team — portrait, and a workspace shot for the hover swap ───────────────
  '/images/team/01.jpg': '1494790108377-be9c29b29330',
  '/images/team/01-alt.jpg': '1586281380349-632531db7ed4',
  '/images/team/02.jpg': '1500648767791-00dcc994a43e',
  '/images/team/02-alt.jpg': '1519389950473-47ba0277781c',
  '/images/team/03.jpg': '1573496359142-b8d87734a5a2',
  '/images/team/03-alt.jpg': '1552664730-d307ca884978',
  '/images/team/04.jpg': '1506794778202-cad84cf45f1d',
  '/images/team/04-alt.jpg': '1521737604893-d14cc237f11d',
  '/images/team/05.jpg': '1580489944761-15a19d654956',
  '/images/team/05-alt.jpg': '1542744173-8e7e53415bb0',
  '/images/team/06.jpg': '1507003211169-0a1dd7228f2d',
  '/images/team/06-alt.jpg': '1459908676235-d5f02a50184b',
};
