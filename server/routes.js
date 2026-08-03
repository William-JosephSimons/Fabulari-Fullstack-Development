function routes(app) {
  // These mock users will be replaced by hashed JSON user data later.
  const users = [
    {
      id: '1',
      username: 'alex',
      password: 'admin123',
      systemRole: 'superAdmin'
    },
    {
      id: '2',
      username: 'billy',
      password: 'user123',
      systemRole: 'user'
    }
  ];

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/api/login', (req, res) => {
    if (!req.body || !req.body.username || !req.body.password) {
      return res.status(400).json({
        valid: false,
        message: 'Username and password are required.'
      });
    }

    const { username, password } = req.body;
    const user = users.find((item) => {
      return item.username === username && item.password === password;
    });

    if (!user) {
      return res.status(401).json({
        valid: false,
        message: 'Credentials do not match.'
      });
    }

    // return user with omitted password to the browser
    const safeUser = {
      id: user.id,
      username: user.username,
      systemRole: user.systemRole
    };

    return res.status(200).json({
      valid: true,
      message: 'Successful login.',
      user: safeUser
    });
  });
}

export { routes };
