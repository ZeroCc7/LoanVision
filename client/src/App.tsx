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
          background: 'rgba(0, 20, 40, 0.7)', 
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 210, 255, 0.2)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 210, 255, 0.5)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 18
            }}>L</div>
            <span style={{ 
              fontSize: 'clamp(14px, 4vw, 20px)', 
              fontWeight: 'bold', 
              letterSpacing: '1px',
              color: '#00d2ff' 
            }}>LoanVision</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '4px', opacity: 0.6 }}>用户:</span>
              <span style={{ color: '#00d2ff', fontWeight: 'bold' }}>{username}</span>
            </div>
            <Button 
              type="text" 
              icon={<LogoutOutlined />} 
              onClick={handleLogout}
              style={{ color: 'rgba(255,255,255,0.65)' }}
              className="hover-neon-red"
            />
          </div>
        </Header>
        <Content style={{ padding: '16px', minHeight: 'calc(100vh - 64px)' }}>
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
        
        <style dangerouslySetInnerHTML={{ __html: `
          .hover-neon-red:hover {
            color: #ff4d4f !important;
            text-shadow: 0 0 8px rgba(255, 77, 79, 0.8);
          }
          @media (max-width: 576px) {
            .ant-layout-content {
              padding: 12px !important;
            }
            .ant-card-body {
              padding: 12px !important;
            }
            .ant-statistic-title {
              font-size: 12px !important;
            }
            .ant-statistic-content {
              font-size: 20px !important;
            }
          }
        `}} />
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
