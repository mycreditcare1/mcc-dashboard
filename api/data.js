export default function handler(req, res) {
  res.status(200).json({
    agents: Math.floor(Math.random() * 10),
    calls: Math.floor(Math.random() * 5),
    leads: Math.floor(Math.random() * 200)
  });
}
