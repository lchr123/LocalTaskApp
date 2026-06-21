/**
 * Japan Prefectures (47 都道府県)
 *
 * Used as manual location options when GPS is unavailable or denied.
 * Each prefecture's coordinates are the prefectural government office
 * (県庁所在地 / 都庁・道庁・府庁) — the standard, verifiable reference
 * point published by 国土地理院 (GSI). These are used only as the center
 * point for distance sorting and radius filtering, not for navigation.
 *
 * Ordered by JIS prefecture code (north → south), the natural ordering
 * Japanese users expect.
 */

export interface JpPrefecture {
  /** Stable identifier (lowercase romaji) */
  id: string;
  /** JIS prefecture code (01–47) */
  code: string;
  /** Japanese display name (都道府県) */
  nameJa: string;
  /** Chinese reference name */
  nameZh: string;
  /** Latitude of the prefectural government office */
  latitude: number;
  /** Longitude of the prefectural government office */
  longitude: number;
}

export const JP_PREFECTURES: JpPrefecture[] = [
  { id: 'hokkaido', code: '01', nameJa: '北海道', nameZh: '北海道', latitude: 43.06417, longitude: 141.34694 },
  { id: 'aomori', code: '02', nameJa: '青森県', nameZh: '青森县', latitude: 40.82444, longitude: 140.74 },
  { id: 'iwate', code: '03', nameJa: '岩手県', nameZh: '岩手县', latitude: 39.70361, longitude: 141.1525 },
  { id: 'miyagi', code: '04', nameJa: '宮城県', nameZh: '宫城县', latitude: 38.26889, longitude: 140.87194 },
  { id: 'akita', code: '05', nameJa: '秋田県', nameZh: '秋田县', latitude: 39.71861, longitude: 140.1025 },
  { id: 'yamagata', code: '06', nameJa: '山形県', nameZh: '山形县', latitude: 38.24056, longitude: 140.36333 },
  { id: 'fukushima', code: '07', nameJa: '福島県', nameZh: '福岛县', latitude: 37.75, longitude: 140.46778 },
  { id: 'ibaraki', code: '08', nameJa: '茨城県', nameZh: '茨城县', latitude: 36.34139, longitude: 140.44667 },
  { id: 'tochigi', code: '09', nameJa: '栃木県', nameZh: '枥木县', latitude: 36.56583, longitude: 139.88361 },
  { id: 'gunma', code: '10', nameJa: '群馬県', nameZh: '群马县', latitude: 36.39111, longitude: 139.06083 },
  { id: 'saitama', code: '11', nameJa: '埼玉県', nameZh: '埼玉县', latitude: 35.85694, longitude: 139.64889 },
  { id: 'chiba', code: '12', nameJa: '千葉県', nameZh: '千叶县', latitude: 35.60472, longitude: 140.12333 },
  { id: 'tokyo', code: '13', nameJa: '東京都', nameZh: '东京都', latitude: 35.68944, longitude: 139.69167 },
  { id: 'kanagawa', code: '14', nameJa: '神奈川県', nameZh: '神奈川县', latitude: 35.44778, longitude: 139.6425 },
  { id: 'niigata', code: '15', nameJa: '新潟県', nameZh: '新潟县', latitude: 37.90222, longitude: 139.02361 },
  { id: 'toyama', code: '16', nameJa: '富山県', nameZh: '富山县', latitude: 36.69528, longitude: 137.21139 },
  { id: 'ishikawa', code: '17', nameJa: '石川県', nameZh: '石川县', latitude: 36.59444, longitude: 136.62556 },
  { id: 'fukui', code: '18', nameJa: '福井県', nameZh: '福井县', latitude: 36.06528, longitude: 136.22194 },
  { id: 'yamanashi', code: '19', nameJa: '山梨県', nameZh: '山梨县', latitude: 35.66389, longitude: 138.56833 },
  { id: 'nagano', code: '20', nameJa: '長野県', nameZh: '长野县', latitude: 36.65139, longitude: 138.18111 },
  { id: 'gifu', code: '21', nameJa: '岐阜県', nameZh: '岐阜县', latitude: 35.39111, longitude: 136.72222 },
  { id: 'shizuoka', code: '22', nameJa: '静岡県', nameZh: '静冈县', latitude: 34.97694, longitude: 138.38306 },
  { id: 'aichi', code: '23', nameJa: '愛知県', nameZh: '爱知县', latitude: 35.18028, longitude: 136.90667 },
  { id: 'mie', code: '24', nameJa: '三重県', nameZh: '三重县', latitude: 34.73028, longitude: 136.50861 },
  { id: 'shiga', code: '25', nameJa: '滋賀県', nameZh: '滋贺县', latitude: 35.00444, longitude: 135.86833 },
  { id: 'kyoto', code: '26', nameJa: '京都府', nameZh: '京都府', latitude: 35.02139, longitude: 135.75556 },
  { id: 'osaka', code: '27', nameJa: '大阪府', nameZh: '大阪府', latitude: 34.68639, longitude: 135.52 },
  { id: 'hyogo', code: '28', nameJa: '兵庫県', nameZh: '兵库县', latitude: 34.69139, longitude: 135.18306 },
  { id: 'nara', code: '29', nameJa: '奈良県', nameZh: '奈良县', latitude: 34.68528, longitude: 135.83278 },
  { id: 'wakayama', code: '30', nameJa: '和歌山県', nameZh: '和歌山县', latitude: 34.22611, longitude: 135.1675 },
  { id: 'tottori', code: '31', nameJa: '鳥取県', nameZh: '鸟取县', latitude: 35.50361, longitude: 134.23833 },
  { id: 'shimane', code: '32', nameJa: '島根県', nameZh: '岛根县', latitude: 35.47222, longitude: 133.05056 },
  { id: 'okayama', code: '33', nameJa: '岡山県', nameZh: '冈山县', latitude: 34.66167, longitude: 133.935 },
  { id: 'hiroshima', code: '34', nameJa: '広島県', nameZh: '广岛县', latitude: 34.39639, longitude: 132.45944 },
  { id: 'yamaguchi', code: '35', nameJa: '山口県', nameZh: '山口县', latitude: 34.18583, longitude: 131.47139 },
  { id: 'tokushima', code: '36', nameJa: '徳島県', nameZh: '德岛县', latitude: 34.06583, longitude: 134.55944 },
  { id: 'kagawa', code: '37', nameJa: '香川県', nameZh: '香川县', latitude: 34.34028, longitude: 134.04333 },
  { id: 'ehime', code: '38', nameJa: '愛媛県', nameZh: '爱媛县', latitude: 33.84167, longitude: 132.76611 },
  { id: 'kochi', code: '39', nameJa: '高知県', nameZh: '高知县', latitude: 33.55972, longitude: 133.53111 },
  { id: 'fukuoka', code: '40', nameJa: '福岡県', nameZh: '福冈县', latitude: 33.60639, longitude: 130.41806 },
  { id: 'saga', code: '41', nameJa: '佐賀県', nameZh: '佐贺县', latitude: 33.24944, longitude: 130.29889 },
  { id: 'nagasaki', code: '42', nameJa: '長崎県', nameZh: '长崎县', latitude: 32.74472, longitude: 129.87361 },
  { id: 'kumamoto', code: '43', nameJa: '熊本県', nameZh: '熊本县', latitude: 32.78972, longitude: 130.74167 },
  { id: 'oita', code: '44', nameJa: '大分県', nameZh: '大分县', latitude: 33.23806, longitude: 131.6125 },
  { id: 'miyazaki', code: '45', nameJa: '宮崎県', nameZh: '宫崎县', latitude: 31.91111, longitude: 131.42389 },
  { id: 'kagoshima', code: '46', nameJa: '鹿児島県', nameZh: '鹿儿岛县', latitude: 31.56028, longitude: 130.55806 },
  { id: 'okinawa', code: '47', nameJa: '沖縄県', nameZh: '冲绳县', latitude: 26.2125, longitude: 127.68111 },
];
