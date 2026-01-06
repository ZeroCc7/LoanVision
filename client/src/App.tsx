import React from 'react';
import { ConfigProvider, Layout, theme, Button, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';

dayjs.locale('zh-cn');
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import {
  LogoutOutlined,
} from '@ant-design/icons';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';

import AccountList from './components/AccountList';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

const { Header, Content } = Layout;

// Placeholder Pages
const CreditCards = () => <AccountList type="credit_card" title="信用卡分期" />;
const CommercialLoans = () => <AccountList type="commercial_loan" title="商业贷款" />;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    const { logout, username } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100%', background: '#000814' }}>
      <Layout style={{ display: 'flex', flexDirection: 'column', background: 'transparent' }}>
        <Header style={{ 
          padding: '0 16px', 
          height: '48px',
          lineHeight: '48px',
          background: 'rgba(0, 8, 20, 0.6)', 
          backdropFilter: 'blur(12px)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid #00d2ff33',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          width: '100%',
          boxShadow: '0 2px 8px rgba(0, 210, 255, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            cursor: 'pointer'
          }} onClick={() => navigate('/')}>
            <div style={{ 
              width: 24, 
              height: 24, 
              background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)', 
              borderRadius: '4px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 14,
              boxShadow: '0 0 10px rgba(0, 210, 255, 0.5)'
            }}>L</div>
            <span style={{ 
              fontSize: 16, 
              fontWeight: 'bold', 
              letterSpacing: '1px',
              color: '#00d2ff' 
            }}>LoanVision</span>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              {username}
            </span>
            <Button 
              type="text" 
              size="small"
              icon={<LogoutOutlined />} 
              onClick={handleLogout}
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              退出
            </Button>
          </div>
        </Header>
        <Content style={{ margin: '12px 16px', flex: 1, overflow: 'initial' }}>
          <div style={{ 
            padding: '16px', 
            minHeight: '100%', 
            background: 'rgba(0, 20, 40, 0.4)', 
            borderRadius: 8,
            border: '1px solid rgba(0, 210, 255, 0.1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
        token: {
          colorPrimary: '#00d2ff', // 科技感的亮蓝色
          borderRadius: 4, // 更硬朗的直角/小圆角
          colorBgBase: '#000814', // 深邃的背景色
        },
        components: {
          Layout: {
            headerBg: 'rgba(0, 20, 40, 0.7)',
          },
          Card: {
            borderRadiusLG: 8,
          }
        }
      }}
    >
      <AntdApp>
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/credit-cards" element={<CreditCards />} />
                        <Route path="/loans" element={<CommercialLoans />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                      </Routes>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
