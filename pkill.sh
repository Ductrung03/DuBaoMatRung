for port in {3000..3009}; do
  sudo fuser -k ${port}/tcp
done
