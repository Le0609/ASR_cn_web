/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 融合 Notion/Arc/Apple Music 的暖灰配色系统
        ink: '#1D1D1F', // 主标题（暖黑）
        body: '#424245', // 正文（中性灰）
        subtle: '#6E6E73', // 辅助文字（浅灰）
        canvas: '#F7F6F3', // 次级背景（Notion 米白）
        divider: '#E5E5E7', // 分隔线（柔和灰）
        brand: {
          DEFAULT: '#1D1D1F', // 主色改为深灰（去蓝化）
          hover: '#2C2C2E',
          active: '#1C1C1E',
        },
        accent: {
          DEFAULT: '#3A3A3C', // 辅助强调色（中灰）
          hover: '#48484A',
        },
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'SF Pro Display',
          'Helvetica Neue',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      fontSize: {
        hero: ['clamp(2.75rem, 6vw, 5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        card: '16px', // 统一大圆角
        button: '12px',
      },
      boxShadow: {
        // Arc 风格柔和阴影
        card: '0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06)',
        btn: '0 1px 2px rgba(0, 0, 0, 0.08)',
        glass: '0 4px 16px rgba(0, 0, 0, 0.06)', // 毛玻璃阴影
      },
      backgroundImage: {
        // Apple Music 风格渐变背景
        'hero-gradient': 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 40%, #F5F5F7 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(250,250,250,0.6) 100%)',
      },
    },
  },
  plugins: [],
};
