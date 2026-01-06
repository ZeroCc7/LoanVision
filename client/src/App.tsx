import React, { useState } from 'react';
import { ConfigProvider, Layout, theme, Menu, Button, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';

dayjs.locale('zh-cn');
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  DashboardOutlined,
  CreditCardOutlined,
  BankOutlined,
  HistoryOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';

import AccountList from './components/AccountList';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

const { Header, Content, Sider } = Layout;

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

const AppLayout: React.FC<{ children: React.ReactNode; isDarkMode: boolean; toggleTheme: () => void }> = ({
  children,
  isDarkMode,
  toggleTheme,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout, username } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/credit-cards',
      icon: <CreditCardOutlined />,
      label: <Link to="/credit-cards">信用卡分期</Link>,
    },
    {
      key: '/loans',
      icon: <BankOutlined />,
      label: <Link to="/loans">商业贷款</Link>,
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: <Link to="/history">还款历史</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">设置</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} theme="dark">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 'bold' }}>
          {!collapsed ? 'LoanVision 还款管理' : 'LV'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
        />
      </Sider>
      <Layout style={{ display: 'flex', flexDirection: 'column' }}>
        <Header style={{ padding: '0 24px', background: isDarkMode ? '#141414' : '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ color: isDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.88)' }}>
              你好, {username}
            </span>
            <Button type="text" onClick={toggleTheme}>
              {isDarkMode ? '🌞 浅色' : '🌙 深色'}
            </Button>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              退出
            </Button>
          </div>
        </Header>
        <Content style={{ margin: '24px', flex: 1, overflow: 'initial' }}>
          <div style={{ padding: 24, minHeight: '100%', background: isDarkMode ? '#141414' : '#fff', borderRadius: 8 }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
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
                    <AppLayout isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
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
